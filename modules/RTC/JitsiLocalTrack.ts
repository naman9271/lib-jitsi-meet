import { getLogger } from '@jitsi/logger';

import JitsiConference from '../../JitsiConference';
import JitsiTrackError from '../../JitsiTrackError';
import {
    JitsiTrackErrors,
    TRACK_IS_DISPOSED,
    TRACK_NO_STREAM_FOUND
} from '../../JitsiTrackErrors';
import {
    LOCAL_TRACK_STOPPED,
    NO_DATA_FROM_SOURCE,
    TRACK_MUTE_CHANGED
} from '../../JitsiTrackEvents';
import { CameraFacingMode } from '../../service/RTC/CameraFacingMode';
import { MediaType } from '../../service/RTC/MediaType';
import RTCEvents from '../../service/RTC/RTCEvents';
import { VideoType } from '../../service/RTC/VideoType';
import {
    NO_BYTES_SENT,
    TRACK_UNMUTED,
    createNoDataFromSourceEvent
} from '../../service/statistics/AnalyticsEvents';
import browser from '../browser';
import Statistics from '../statistics/statistics';
import { isValidNumber } from '../util/MathUtil';

import JitsiTrack from './JitsiTrack';
import RTCUtils from './RTCUtils';
import TraceablePeerConnection from './TraceablePeerConnection';

const logger = getLogger('modules/RTC/JitsiLocalTrack');

export interface IStreamEffect {
    isEnabled: (track: JitsiLocalTrack) => boolean;
    isMuted?: () => boolean;
    setMuted?: (muted: boolean) => void;
    startEffect: (stream: MediaStream) => MediaStream;
    stopEffect: () => void;
}

export interface ITrackMetadata {
    displaySurface?: string;
    timestamp: number;
}

export interface ITrackConstraints {
    [key: string]: any;
    height?: any;
    width?: any;
}

export interface ITrackInfo {
    constraints: ITrackConstraints;
    deviceId: string;
    effects?: IStreamEffect[];
    facingMode?: CameraFacingMode;
    mediaType: MediaType;
    rtcId: number;
    sourceId?: string;
    sourceType?: string;
    stream: MediaStream;
    track: MediaStreamTrack;
    videoType?: VideoType;
}

export interface IStreamInfo {
    stream: MediaStream;
    track: MediaStreamTrack;
    videoType?: VideoType;
}

export interface IAudioConstraints {
    autoGainControl?: boolean;
    channelCount?: number;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
}

/**
 * Represents a single media track(either audio or video).
 * One <tt>JitsiLocalTrack</tt> corresponds to one WebRTC MediaStreamTrack.
 */
export default class JitsiLocalTrack extends JitsiTrack {
    private _setEffectInProgress: boolean;
    private _constraints: ITrackConstraints;
    private _prevSetMuted: Promise<void>;
    private _facingMode?: CameraFacingMode;
    private _trackEnded: boolean;
    private _hasSentData: boolean;
    private _testDataSent: boolean;
    private _realDeviceId?: string;
    private _sourceName?: string;
    private _ssrc?: number;
    private _trackMutedTS: number;
    private _onDeviceListWillChange: (devices: MediaDeviceInfo[]) => void;
    private _onAudioOutputDeviceChanged?: () => void;
    private _streamEffect?: IStreamEffect;
    private _originalStream?: MediaStream;
    private _stopStreamInProgress: boolean;
    private _effectEnabled?: boolean;
    public metadata: ITrackMetadata;
    public rtcId: number;
    public sourceId?: string;
    public sourceType?: string;
    public deviceId: string;
    public resolution?: number;
    public maxEnabledResolution?: number;
    public conference: JitsiConference | null;

    /**
     * Constructs a new JitsiLocalTrack instance.
     *
     * @constructor
     * @param {Object} trackInfo
     * @param {Object} trackInfo.constraints - The contraints used for creating the track.
     * @param {number} trackInfo.rtcId - The ID assigned by the RTC module.
     * @param {Object} trackInfo.stream - The WebRTC MediaStream, parent of the track.
     * @param {Object} trackInfo.track - The underlying WebRTC MediaStreamTrack for new JitsiLocalTrack.
     * @param {string} trackInfo.mediaType - The MediaType of the JitsiLocalTrack.
     * @param {string} trackInfo.videoType - The VideoType of the JitsiLocalTrack.
     * @param {Array<Object>} trackInfo.effects - The effects to be applied to the JitsiLocalTrack.
     * @param {string} trackInfo.deviceId - The ID of the local device for this track.
     * @param {string} trackInfo.facingMode - Thehe camera facing mode used in getUserMedia call (for mobile only).
     * @param {string} trackInfo.sourceId - The id of the desktop sharing source, which is the Chrome media source ID,
     * returned by Desktop Picker on Electron. NOTE: defined for desktop sharing tracks only.
     * @param {string} trackInfo.sourceType - The type of source the track originates from.
     */
    constructor({
        constraints,
        deviceId,
        facingMode,
        mediaType,
        rtcId,
        sourceId,
        sourceType,
        stream,
        track,
        videoType,
        effects = []
    }: ITrackInfo) {
        super(
            /* conference */ null,
            stream,
            track,
            /* streamInactiveHandler */ () => this.emit(LOCAL_TRACK_STOPPED, this),
            mediaType,
            videoType);

        this._setEffectInProgress = false;
        const effect = effects.find(e => e.isEnabled(this));

        if (effect) {
            this._startStreamEffect(effect);
        }

        const displaySurface = videoType === VideoType.DESKTOP
            ? track.getSettings().displaySurface
            : null;

        /**
         * Track metadata.
         */
        this.metadata = {
            timestamp: Date.now(),
            ...displaySurface ? { displaySurface } : {}
        };


        /**
         * The ID assigned by the RTC module on instance creation.
         *
         * @type {number}
         */
        this.rtcId = rtcId;
        this.sourceId = sourceId;
        this.sourceType = sourceType ?? displaySurface;

        // Cache the constraints of the track in case of any this track
        // model needs to call getUserMedia again, such as when unmuting.
        this._constraints = track.getConstraints();

        if (mediaType === MediaType.VIDEO) {
            if (videoType === VideoType.CAMERA) {
                // Safari returns an empty constraints object, construct the constraints using getSettings.
                // Firefox in "fingerprint resistance mode" does a similar thing, except a `mediaSource` key is set.
                if (!this._constraints.height || !this._constraints.width) {
                    this._constraints = {
                        height: { ideal: this.getHeight() },
                        width: { ideal: this.getWidth() }
                    };
                }

                // If the constraints are still empty, fallback to the constraints used for initial gUM.
                if (!isValidNumber(this._constraints.height.ideal) && !isValidNumber(this._constraints.width.ideal)) {
                    this._constraints.height = { ideal: constraints.height.ideal };
                    this._constraints.width = { ideal: constraints.width.ideal };
                }
            }

            // Get the resolution from the track itself since we do not know what camera capability the browser has
            // picked for the given constraints, fallback to the constraints if MediaStreamTrack.getSettings() doesn't
            // return the height.
            this.resolution = this.getHeight();
            if (!isValidNumber(this.resolution) && this._constraints.height?.ideal) {
                this.resolution = this._constraints.height.ideal;
            }
            this.maxEnabledResolution = this.resolution;
        }

        this.deviceId = deviceId;

        /**
         * The <tt>Promise</tt> which represents the progress of a previously
         * queued/scheduled {@link _setMuted} (from the point of view of
         * {@link _queueSetMuted}).
         *
         * @private
         * @type {Promise}
         */
        this._prevSetMuted = Promise.resolve();

        /**
         * The facing mode of the camera from which this JitsiLocalTrack
         * instance was obtained.
         *
         * @private
         * @type {CameraFacingMode|undefined}
         */
        this._facingMode = facingMode;

        // Currently there is no way to know the MediaStreamTrack ended due to
        // to device disconnect in Firefox through e.g. "readyState" property.
        // Instead we will compare current track's label with device labels from
        // enumerateDevices() list.
        this._trackEnded = false;

        /**
         * Indicates whether data has been sent or not.
         */
        this._hasSentData = false;

        /**
         * Used only for detection of audio problems. We want to check only once
         * whether the track is sending data ot not. This flag is set to false
         * after the check.
         */
        this._testDataSent = true;

        // Currently there is no way to determine with what device track was
        // created (until getConstraints() support), however we can associate
        // tracks with real devices obtained from enumerateDevices() call as
        // soon as it's called.
        // NOTE: this.deviceId corresponds to the device id specified in GUM constraints and this._realDeviceId seems to
        // correspond to the id of a matching device from the available device list.
        this._realDeviceId = this.deviceId === '' ? undefined : this.deviceId;

        // The source name that will be signaled for this track.
        this._sourceName = null;

        // The primary SSRC associated with the local media track. This will be set after the local desc
        // is processed once the track is added to the peerconnection.
        this._ssrc = null;

        this._trackMutedTS = 0;

        this._onDeviceListWillChange = (devices: MediaDeviceInfo[]) => {
            const oldRealDeviceId = this._realDeviceId;

            this._setRealDeviceIdFromDeviceList(devices);

            if (
                // Mark track as ended for those browsers that do not support
                // "readyState" property. We do not touch tracks created with
                // default device ID "".
                (typeof this.getTrack().readyState === 'undefined'
                    && typeof this._realDeviceId !== 'undefined'
                    && !devices.find(d => d.deviceId === this._realDeviceId))

                // If there was an associated realDeviceID and after the device change the realDeviceId is undefined
                // then the associated device has been disconnected and the _trackEnded flag needs to be set. In
                // addition on some Chrome versions the readyState property is set after the device change event is
                // triggered which causes issues in jitsi-meet with the selection of a new device because we don't
                // detect that the old one was removed.
                || (typeof oldRealDeviceId !== 'undefined' && typeof this._realDeviceId === 'undefined')
            ) {
                this._trackEnded = true;
            }
        };

        // Subscribe each created local audio track to
        // RTCEvents.AUDIO_OUTPUT_DEVICE_CHANGED event. This is different from
        // handling this event for remote tracks (which are handled in RTC.js),
        // because there might be local tracks not attached to a conference.
        if (this.isAudioTrack() && RTCUtils.isDeviceChangeAvailable('output')) {
            this._onAudioOutputDeviceChanged = this.setAudioOutput.bind(this);
            RTCUtils.addListener(
                RTCEvents.AUDIO_OUTPUT_DEVICE_CHANGED,
                this._onAudioOutputDeviceChanged);
        }

        RTCUtils.addListener(RTCEvents.DEVICE_LIST_WILL_CHANGE, this._onDeviceListWillChange);

        this._initNoDataFromSourceHandlers();
    }

    /**
     * Adds stream to conference and marks it as "unmute" operation.
     *
     * @private
     * @returns {Promise}
     */
    private _addStreamToConferenceAsUnmute(): Promise<void> {
        if (!this.conference) {
            return Promise.resolve();
        }

        // FIXME it would be good to not included conference as part of this process. Only TraceablePeerConnections to
        // which the track is attached should care about this action. The TPCs to which the track is not attached can
        // sync up when track is re-attached. A problem with that is that the "modify sources" queue is part of the
        // JingleSessionPC and it would be excluded from the process. One solution would be to extract class between
        // TPC and JingleSessionPC which would contain the queue and would notify the signaling layer when local SSRCs
        // are changed. This would help to separate XMPP from the RTC module.
        return new Promise((resolve, reject) => {
            this.conference._addLocalTrackToPc(this)
                .then(resolve, (error: any) => reject(new Error(error)));
        });
    }

    /**
     * Fires NO_DATA_FROM_SOURCE event and logs it to analytics
     *
     * @private
     * @returns {void}
     */
    private _fireNoDataFromSourceEvent(): void {
        const value = !this.isReceivingData();

        this.emit(NO_DATA_FROM_SOURCE, value);

        logger.debug(`NO_DATA_FROM_SOURCE event with value ${value} detected for track: ${this}`);

        // FIXME: Should we report all of those events
        Statistics.sendAnalytics(createNoDataFromSourceEvent(this.getType(), value));
    }

    /**
     * Sets handlers to the MediaStreamTrack object that will detect camera issues.
     *
     * @private
     * @returns {void}
     */
    private _initNoDataFromSourceHandlers(): void {
        if (!this._isNoDataFromSourceEventsEnabled()) {
            return;
        }

        this._setHandler('track_mute', () => {
            this._trackMutedTS = window.performance.now();
            this._fireNoDataFromSourceEvent();
        });

        this._setHandler('track_unmute', () => {
            this._fireNoDataFromSourceEvent();
            Statistics.sendAnalyticsAndLog(
                TRACK_UNMUTED,
                {
                    'media_type': this.getType(),
                    'track_type': 'local',
                    value: window.performance.now() - this._trackMutedTS
                });
        });

        if (this.isVideoTrack() && this.videoType === VideoType.CAMERA) {
            this._setHandler('track_ended', () => {
                if (!this.isReceivingData()) {
                    this._fireNoDataFromSourceEvent();
                }
            });
        }
    }

    /**
     * Returns true if no data from source events are enabled for this JitsiLocalTrack and false otherwise.
     *
     * @private
     * @returns {boolean} - True if no data from source events are enabled for this JitsiLocalTrack and false otherwise.
     */
    private _isNoDataFromSourceEventsEnabled(): boolean {
        // Disable the events for screen sharing.
        return !this.isVideoTrack() || this.videoType !== VideoType.DESKTOP;
    }

    /**
     * Initializes a new Promise to execute {@link #_setMuted}. May be called multiple times in a row and the
     * invocations of {@link #_setMuted} and, consequently, {@link #mute} and/or {@link #unmute} will be resolved in a
     * serialized fashion.
     *
     * @param {boolean} muted - The value to invoke <tt>_setMuted</tt> with.
     * @private
     * @returns {Promise}
     */
    private _queueSetMuted(muted: boolean): Promise<void> {
        const setMuted = this._setMuted.bind(this, muted);

        this._prevSetMuted = this._prevSetMuted.then(setMuted, setMuted);

        return this._prevSetMuted;
    }

    /**
     * Removes stream from conference and marks it as "mute" operation.
     *
     * @param {Function} successCallback - Callback that will be called when the operation is successful.
     * @param {Function} errorCallback - Callback that will be called when the operation fails.
     * @private
     * @returns {Promise}
     */
    private _removeStreamFromConferenceAsMute(successCallback: () => void, errorCallback: (error: Error) => void): void {
        if (!this.conference) {
            successCallback();

            return;
        }
        this.conference._removeLocalTrackFromPc(this).then(
            successCallback,
            (error: any) => errorCallback(new Error(error)));
    }

    /**
     * Sends mute status for a track to conference if any.
     *
     * @param {boolean} mute - If track is muted.
     * @private
     * @returns {void}
     */
    private _sendMuteStatus(mute: boolean): void {
        if (this.conference) {
            this.conference._setTrackMuteStatus(this, mute) && this.conference.room.sendPresence();
        }
    }

    /**
     * Mutes / unmutes this track.
     *
     * @param {boolean} muted - If <tt>true</tt>, this track will be muted; otherwise, this track will be unmuted.
     * @private
     * @returns {Promise}
     */
    private _setMuted(muted: boolean): Promise<void> {
        if (this.isMuted() === muted && this.videoType !== VideoType.DESKTOP) {
            return Promise.resolve();
        }

        if (this.disposed) {
            return Promise.reject(new JitsiTrackError(TRACK_IS_DISPOSED));
        }

        let promise: Promise<void | IStreamInfo[]> = Promise.resolve();

        // A function that will print info about muted status transition
        const logMuteInfo = () => logger.info(`Mute ${this}: ${muted}`);

        // In React Native we mute the camera by setting track.enabled but that doesn't
        // work for screen-share tracks, so do the remove-as-mute for those.
        const doesVideoMuteByStreamRemove
            = browser.isReactNative() ? this.videoType === VideoType.DESKTOP : browser.doesVideoMuteByStreamRemove();

        // In the multi-stream mode, desktop tracks are muted from jitsi-meet instead of being removed from the
        // conference. This is needed because we don't want the client to signal a source-remove to the remote peer for
        // the desktop track when screenshare is stopped. Later when screenshare is started again, the same sender will
        // be re-used without the need for signaling a new ssrc through source-add.
        if (this.isAudioTrack() || !doesVideoMuteByStreamRemove) {
            logMuteInfo();

            // If we have a stream effect that implements its own mute functionality, prioritize it before
            // normal mute e.g. the stream effect that implements system audio sharing has a custom
            // mute state in which if the user mutes, system audio still has to go through.
            if (this._streamEffect?.setMuted) {
                this._streamEffect.setMuted(muted);
            } else if (this.track) {
                this.track.enabled = !muted;
            }
        } else if (muted) {
            promise = new Promise((resolve, reject) => {
                logMuteInfo();
                this._removeStreamFromConferenceAsMute(
                    () => {
                        if (this._streamEffect) {
                            this._stopStreamEffect();
                        }

                        // FIXME: Maybe here we should set the SRC for the
                        // containers to something
                        // We don't want any events to be fired on this stream
                        this._unregisterHandlers();
                        this.stopStream();
                        this._setStream(null);

                        resolve();
                    },
                    reject);
            });
        } else {
            logMuteInfo();

            let streamOptions;

            if (this.videoType === VideoType.CAMERA) {
                streamOptions = {
                    cameraDeviceId: this.getDeviceId(),
                    devices: [ MediaType.VIDEO ],
                    effects: this._streamEffect ? [ this._streamEffect ] : [],
                    facingMode: this.getCameraFacingMode()
                };
            } else {
                streamOptions = {
                    devices: [ MediaType.DESKTOP ],
                };
            }

            promise
                = RTCUtils.obtainAudioAndVideoPermissions({

                    ...streamOptions,
                    constraints: { video: this._constraints } } as any) as Promise<IStreamInfo[]>;

            promise = promise.then((streamsInfo: IStreamInfo[]) => {
                const streamInfo = streamsInfo.find(info => info.track.kind === this.getType());

                if (streamInfo) {
                    this._setStream(streamInfo.stream);
                    this.track = streamInfo.track;

                    // This is not good when video type changes after
                    // unmute, but let's not crash here
                    if (this.videoType !== streamInfo.videoType) {
                        logger.warn(
                            `${this}: video type has changed after unmute!`,
                            this.videoType, streamInfo.videoType);
                        this.videoType = streamInfo.videoType;
                    }
                } else {
                    throw new JitsiTrackError(TRACK_NO_STREAM_FOUND);
                }

                if (this._streamEffect) {
                    this._startStreamEffect(this._streamEffect);
                }

                this.containers.map(cont => RTCUtils.attachMediaStream(cont, this.stream).catch(() => {
                    logger.error(`Attach media failed for ${this} on video unmute!`);
                }));

                return this._addStreamToConferenceAsUnmute();
            });
        }

        return promise
            .then(() => {
                this._sendMuteStatus(muted);

                // Send the videoType message to the bridge.
                this.isVideoTrack() && this.conference?._sendBridgeVideoTypeMessage(this);
                this.emit(TRACK_MUTE_CHANGED, this);
            });
    }

    /**
     * Sets real device ID by comparing track information with device information. This is temporary solution until
     * getConstraints() method will be implemented in browsers.
     *
     * @param {MediaDeviceInfo[]} devices - The list of devices obtained from enumerateDevices() call.
     * @private
     * @returns {void}
     */
    private _setRealDeviceIdFromDeviceList(devices: MediaDeviceInfo[]): void {
        const track = this.getTrack();
        const kind = `${track.kind}input`;

        // We need to match by deviceId as well, in case of multiple devices with the same label.
        let device = devices.find(d => d.kind === kind && d.label === track.label && d.deviceId === this.deviceId);

        if (!device && this._realDeviceId === 'default') { // the default device has been changed.
            // If the default device was 'A' and the default device is changed to 'B' the label for the track will
            // remain 'Default - A' but the label for the device in the device list will be updated to 'A'. That's
            // why in order to match it we need to remove the 'Default - ' part.
            const label = (track.label || '').replace('Default - ', '');

            device = devices.find(d => d.kind === kind && d.label === label);
        }

        if (device) {
            this._realDeviceId = device.deviceId;
        } else {
            this._realDeviceId = undefined;
        }
    }

    /**
     * Starts the effect process and returns the modified stream.
     *
     * @param {Object} effect - Represents effect instance
     * @private
     * @returns {void}
     */
    private _startStreamEffect(effect: IStreamEffect): void {
        this._streamEffect = effect;
        this._originalStream = this.stream;
        this._setStream(this._streamEffect.startEffect(this._originalStream));
        this.track = this.stream.getTracks()[0];
    }

    /**
     * Stops the effect process and returns the original stream.
     *
     * @private
     * @returns {void}
     */
    private _stopStreamEffect(): void {
        if (this._streamEffect) {
            this._streamEffect.stopEffect();
            this._setStream(this._originalStream);
            this._originalStream = null;
            this.track = this.stream ? this.stream.getTracks()[0] : null;
        }
    }

    /**
     * Switches the camera facing mode if the WebRTC implementation supports the custom MediaStreamTrack._switchCamera
     * method. Currently, the method in question is implemented in react-native-webrtc only. When such a WebRTC
     * implementation is executing, the method is the preferred way to switch between the front/user-facing and the
     * back/environment-facing cameras because it will likely be (as is the case of react-native-webrtc) noticeably
     * faster that creating a new MediaStreamTrack via a new getUserMedia call with the switched facingMode constraint
     * value. Moreover, the approach with a new getUserMedia call may not even work: WebRTC on Android and iOS is
     * either very slow to open the camera a second time or plainly freezes attempting to do that.
     *
     * @returns {void}
     */
    private _switchCamera(): void {
        if (this.isVideoTrack()
            && this.videoType === VideoType.CAMERA
            && typeof this.track._switchCamera === 'function') {
            this.track._switchCamera();

            this._facingMode
                = this._facingMode === CameraFacingMode.ENVIRONMENT
                    ? CameraFacingMode.USER
                    : CameraFacingMode.ENVIRONMENT;
        }
    }

    /**
     * Stops the currently used effect (if there is one) and starts the passed effect (if there is one).
     *
     * @param {Object|undefined} effect - The new effect to be set.
     * @private
     * @returns {void}
     */
    private _switchStreamEffect(effect?: IStreamEffect): void {
        if (this._streamEffect) {
            this._stopStreamEffect();
            this._streamEffect = undefined;
        }
        if (effect) {
            this._startStreamEffect(effect);
        }
    }

    /**
     * Sets the stream property of JitsiLocalTrack object and sets all stored handlers to it.
     *
     * @param {MediaStream} stream - The new MediaStream.
     * @private
     * @returns {void}
     */
    protected _setStream(stream: MediaStream | null): void {
        super._setStream(stream);
    }


    /**
     * @inheritdoc
     *
     * Stops sending the media track. And removes it from the HTML. NOTE: Works for local tracks only.
     *
     * @extends JitsiTrack#dispose
     * @returns {Promise}
     */
    async dispose(): Promise<void> {
        if (this.disposed) {
            return;
        }

        // Remove the effect instead of stopping it so that the original stream is restored
        // on both the local track and on the peerconnection.
        if (this._streamEffect) {
            await this.setEffect(undefined);
        }

        if (this.conference) {
            await this.conference.removeTrack(this);
        }

        if (this.stream) {
            this.stopStream();
        }

        RTCUtils.removeListener(RTCEvents.DEVICE_LIST_WILL_CHANGE, this._onDeviceListWillChange);

        if (this._onAudioOutputDeviceChanged) {
            RTCUtils.removeListener(RTCEvents.AUDIO_OUTPUT_DEVICE_CHANGED,
                this._onAudioOutputDeviceChanged);
        }

        return super.dispose();
    }

    /**
     * Returns facing mode for video track from camera. For other cases (e.g. audio track or 'desktop' video track)
     * returns undefined.
     *
     * @returns {CameraFacingMode|undefined}
     */
    getCameraFacingMode(): CameraFacingMode | undefined {
        if (this.isVideoTrack() && this.videoType === VideoType.CAMERA) {
            // MediaStreamTrack#getSettings() is not implemented in many
            // browsers, so we need feature checking here. Progress on the
            // respective browser's implementation can be tracked at
            // https://bugs.chromium.org/p/webrtc/issues/detail?id=2481 for
            // Chromium and https://bugzilla.mozilla.org/show_bug.cgi?id=1213517
            // for Firefox. Even if a browser implements getSettings() already,
            // it might still not return anything for 'facingMode'.
            const trackSettings = this.track.getSettings?.();

            if (trackSettings && 'facingMode' in trackSettings) {
                return trackSettings.facingMode as CameraFacingMode;
            }

            if (typeof this._facingMode !== 'undefined') {
                return this._facingMode;
            }

            // In most cases we are showing a webcam. So if we've gotten here,
            // it should be relatively safe to assume that we are probably
            // showing the user-facing camera.
            return CameraFacingMode.USER;
        }

        return undefined;
    }

    /**
     * Returns the capture resolution of the video track.
     *
     * @returns {Number}
     */
    getCaptureResolution(): number {
        if (this.videoType === VideoType.CAMERA || !browser.isWebKitBased()) {
            return this.resolution!;
        }

        return this.getHeight();
    }

    /**
     * Returns device id associated with track.
     *
     * @returns {string}
     */
    getDeviceId(): string {
        return this._realDeviceId || this.deviceId;
    }

    /**
     * Get the duration of the track.
     *
     * @returns {Number} the duration of the track in seconds
     */
    getDuration(): number {
        return (Date.now() / 1000) - (this.metadata.timestamp / 1000);
    }

    /**
     * Returns the participant id which owns the track.
     *
     * @returns {string} the id of the participants. It corresponds to the
     * Colibri endpoint id/MUC nickname in case of Jitsi-meet.
     */
    getParticipantId(): string {
        return this.conference?.myUserId();
    }

    /**
     * Returns the source name associated with the jitsi track.
     *
     * @returns {string | null} source name
     */
    getSourceName(): string | null {
        return this._sourceName;
    }

    /**
     * Returns the primary SSRC associated with the track.
     * @returns {number}
     */
    getSsrc(): number | null {
        return this._ssrc;
    }

    /**
     * Returns if associated MediaStreamTrack is in the 'ended' state
     *
     * @returns {boolean}
     */
    isEnded(): boolean {
        if (this.isVideoTrack() && this.isMuted()) {
            // If a video track is muted the readyState will be ended, that's why we need to rely only on the
            // _trackEnded flag.
            return this._trackEnded;
        }

        return this.getTrack().readyState === 'ended' || this._trackEnded;
    }

    /**
     * Returns <tt>true</tt>.
     *
     * @returns {boolean} <tt>true</tt>
     */
    isLocal(): boolean {
        return true;
    }

    /**
     * Returns <tt>true</tt> - if the stream is muted and <tt>false</tt> otherwise.
     *
     * @returns {boolean} <tt>true</tt> - if the stream is muted and <tt>false</tt> otherwise.
     */
    isMuted(): boolean {
        // this.stream will be null when we mute local video on Chrome
        if (!this.stream) {
            return true;
        }
        if (this.isVideoTrack() && !this.isActive()) {
            return true;
        }

        // If currently used stream effect has its own muted state, use that.
        if (this._streamEffect?.isMuted) {
            return this._streamEffect.isMuted();
        }

        return !this.track?.enabled;
    }

    /**
     * Checks whether the attached MediaStream is receiving data from source or not. If the stream property is null
     * (because of mute or another reason) this method will return false.
     * NOTE: This method doesn't indicate problem with the streams directly. For example in case of video mute the
     * method will return false or if the user has disposed the track.
     *
     * @returns {boolean} true if the stream is receiving data and false this otherwise.
     */
    isReceivingData(): boolean {
        if (this.isVideoTrack()
            && (this.isMuted() || this._stopStreamInProgress || this.videoType === VideoType.DESKTOP)) {
            return true;
        }

        if (!this.stream) {
            return false;
        }

        // In older version of the spec there is no muted property and readyState can have value muted. In the latest
        // versions readyState can have values "live" and "ended" and there is muted boolean property. If the stream is
        // muted that means that we aren't receiving any data from the source. We want to notify the users for error if
        // the stream is muted or ended on it's creation.

        // For video blur enabled use the original video stream
        const stream = this._effectEnabled ? this._originalStream : this.stream;

        return stream.getTracks().some(track =>
            (!('readyState' in track) || track.readyState === 'live')
            && (!('muted' in track) || track.muted !== true));
    }

    /**
     * Asynchronously mutes this track.
     *
     * @returns {Promise}
     */
    mute(): Promise<void> {
        return this._queueSetMuted(true);
    }

    /**
     * Handles bytes sent statistics. NOTE: used only for audio tracks to detect audio issues.
     *
     * @param {TraceablePeerConnection} tpc - The peerconnection that is reporting the bytes sent stat.
     * @param {number} bytesSent - The new value.
     * @returns {void}
     */
    onByteSentStatsReceived(tpc: TraceablePeerConnection, bytesSent: number): void {
        if (bytesSent > 0) {
            this._hasSentData = true;
        }
        const iceConnectionState = tpc.getConnectionState();

        if (this._testDataSent && iceConnectionState === 'connected') {
            setTimeout(() => {
                if (!this._hasSentData) {
                    logger.warn(`${this} 'bytes sent' <= 0: \
                        ${bytesSent}`);

                    Statistics.analytics.sendEvent(NO_BYTES_SENT, { 'media_type': this.getType() });
                }
            }, 3000);
            this._testDataSent = false;
        }
    }

    /**
     * Sets the JitsiConference object associated with the track. This is temp solution.
     *
     * @param conference - JitsiConference object.
     * @returns {void}
     */
    setConference(conference: JitsiConference): void {
        this.conference = conference;
    }

    /**
     * Sets the effect and switches between the modified stream and original one.
     *
     * @param {Object} effect - Represents the effect instance to be used.
     * @returns {Promise}
     */
    setEffect(effect?: IStreamEffect): Promise<void> {
        if (typeof this._streamEffect === 'undefined' && typeof effect === 'undefined') {
            return Promise.resolve();
        }

        if (typeof effect !== 'undefined' && !effect.isEnabled(this)) {
            return Promise.reject(new Error('Incompatible effect instance!'));
        }

        if (this._setEffectInProgress === true) {
            return Promise.reject(new Error('setEffect already in progress!'));
        }

        // In case we have an audio track that is being enhanced with an effect, we still want it to be applied,
        // even if the track is muted. Where as for video the actual track doesn't exists if it's muted.
        if (this.isMuted() && !this.isAudioTrack()) {
            this._streamEffect = effect;

            return Promise.resolve();
        }

        const conference = this.conference;

        if (!conference) {
            this._switchStreamEffect(effect);
            if (this.isVideoTrack()) {
                this.containers.forEach(cont => {
                    RTCUtils.attachMediaStream(cont, this.stream).catch(() => {
                        logger.error(`Attach media failed for ${this} when trying to set effect.`);
                    });
                });
            }

            return Promise.resolve();
        }

        this._setEffectInProgress = true;

        return conference._removeLocalTrackFromPc(this)
            .then(() => {
                this._switchStreamEffect(effect);
                if (this.isVideoTrack()) {
                    this.containers.forEach(cont => {
                        RTCUtils.attachMediaStream(cont, this.stream).catch(() => {
                            logger.error(`Attach media failed for ${this} when trying to set effect.`);
                        });
                    });
                }

                return conference._addLocalTrackToPc(this);
            })
            .then(() => {
                this._setEffectInProgress = false;
            })
            .catch((error: any) => {
                // Any error will be not recovarable and will trigger CONFERENCE_FAILED event. But let's try to cleanup
                // everyhting related to the effect functionality.
                this._setEffectInProgress = false;
                this._switchStreamEffect();
                logger.error('Failed to switch to the new stream!', error);
                throw error;
            });
    }

    /**
     * Sets the source name to be used for signaling the jitsi track.
     *
     * @param {string} name The source name.
     */
    setSourceName(name: string): void {
        this._sourceName = name;
    }

    /**
     * Sets the primary SSRC for the track.
     *
     * @param {number} ssrc The SSRC.
     */
    setSsrc(ssrc: number): void {
        if (isValidNumber(ssrc)) {
            this._ssrc = ssrc;
        }
    }

    /**
     * Stops the associated MediaStream.
     *
     * @returns {void}
     */
    stopStream(): void {
        /**
         * Indicates that we are executing {@link #stopStream} i.e.
         * {@link RTCUtils#stopMediaStream} for the <tt>MediaStream</tt>
         * associated with this <tt>JitsiTrack</tt> instance.
         *
         * @private
         * @type {boolean}
         */
        this._stopStreamInProgress = true;

        try {
            RTCUtils.stopMediaStream(this.stream);
        } finally {
            this._stopStreamInProgress = false;
        }
    }

    /**
     * Creates a text representation of this local track instance.
     *
     * @return {string}
     */
    toString(): string {
        return `LocalTrack[${this.rtcId},${this.getType()}]`;
    }

    /**
     * Asynchronously unmutes this track.
     *
     * @returns {Promise}
     */
    unmute(): Promise<void> {
        return this._queueSetMuted(false);
    }

    /**
     * Applies media constraints to the current MediaStreamTrack.
     *
     * @param {IAudioConstraints} constraints - Media constraints to apply.
     * @returns {Promise<void>}
     */
    async applyConstraints(constraints: IAudioConstraints): Promise<void> {
        const mediaType = this.getType();

        if (!this.isAudioTrack()) {
            throw new Error(`Media ${mediaType} is not supported, track must be audio`);
        }

        const hasAudioMixEffect = Boolean(typeof this._streamEffect?.setMuted === 'function');

        if (this._streamEffect && !hasAudioMixEffect) {
            throw new Error(`Cannot apply constraints while the effect ${JSON.stringify(
                this._streamEffect)} is active`
            );
        }

        await this.conference._removeLocalTrackFromPc(this);

        if (hasAudioMixEffect) {
            this._stopStreamEffect();
        }

        this.stopStream();

        const initialSettings = this.track.getSettings();
        const constraintsToApply = {
            ...initialSettings,
            ...constraints
        };

        const deviceIdKey = mediaType === MediaType.AUDIO ? 'micDeviceId' : 'cameraDeviceId';
        let mediaStreamData;

        try {
            [ mediaStreamData ] = await RTCUtils.obtainAudioAndVideoPermissions({
                constraints: { [mediaType]: constraintsToApply },
                [deviceIdKey]: constraintsToApply.deviceId,
                devices: [ mediaType ]
            });

            if (!mediaStreamData?.stream) {
                throw new JitsiTrackError(JitsiTrackErrors.CONSTRAINT_FAILED);
            }

        } catch (error) {
            logger.error(
                `applyConstraints failed for track ${this} with constraints: ${JSON.stringify(
                    constraints
                )}: `,
                error
            );

            [ mediaStreamData ] = await RTCUtils.obtainAudioAndVideoPermissions({
                constraints: { [mediaType]: initialSettings },
                [deviceIdKey]: constraintsToApply.deviceId,
                devices: [ mediaType ]
            });
        }

        if (!mediaStreamData?.stream) {
            throw new JitsiTrackError(JitsiTrackErrors.GENERAL);
        }

        this._setStream(mediaStreamData.stream);
        this.track = mediaStreamData.track;

        if (hasAudioMixEffect) {
            this._startStreamEffect(this._streamEffect);
        }

        await this.conference._addLocalTrackToPc(this);
    }
}
