export enum XMPPEvents {

    /**
     * Indicates error while adding ice candidate.
     */
    ADD_ICE_CANDIDATE_FAILED = 'xmpp.add_ice_candidate_failed',

    // Designates an event indicating that the focus has asked us to mute our
    // audio.
    AUDIO_MUTED_BY_FOCUS = 'xmpp.audio_muted_by_focus',

    AUTHENTICATION_REQUIRED = 'xmpp.authentication_required',

    /**
     * Event fired when we receive a message for AV moderation approved for the local participant.
     */
    AV_MODERATION_APPROVED = 'xmpp.av_moderation.approved',

    /**
     * Event fired when the moderation enable/disable changes.
     */
    AV_MODERATION_CHANGED = 'xmpp.av_moderation.changed',

    /**
     * Event fired when we receive message that a new jid was approved.
     */
    AV_MODERATION_PARTICIPANT_APPROVED = 'xmpp.av_moderation.participant.approved',

    /**
     * Event fired when we receive message that a new jid was approved.
     */
    AV_MODERATION_PARTICIPANT_REJECTED = 'xmpp.av_moderation.participant.rejected',

    /**
     * Event fired when we receive a message for AV moderation.
     */
    AV_MODERATION_RECEIVED = 'xmpp.av_moderation.received',

    /**
    * Event fired when we receive a message for AV moderation rejected for the local participant.
    */
    AV_MODERATION_REJECTED = 'xmpp.av_moderation.rejected',

    /**
     * Event fired when we receive a message for breakout rooms.
     */
    BREAKOUT_ROOMS_EVENT = 'xmpp.breakout-rooms.event',

    /**
     * Event fired when a participant is requested to join a given (breakout) room.
     */
    BREAKOUT_ROOMS_MOVE_TO_ROOM = 'xmpp.breakout-rooms.move-to-room',

    /**
     * Event fired when the breakout rooms data was updated.
     */
    BREAKOUT_ROOMS_UPDATED = 'xmpp.breakout-rooms.updated',

    BRIDGE_DOWN = 'xmpp.bridge_down',

    /**
     * Triggered when 'session-accept' is received from the responder.
     */
    CALL_ACCEPTED = 'xmpp.callaccepted.jingle',

    // Triggered when Jicofo kills our media session, this can happen while
    // we're still in the MUC, when it decides to terminate the media session.
    // For example when the session is idle for too long, because we're the only
    // person in the conference room.
    CALL_ENDED = 'xmpp.callended.jingle',

    // Designates an event indicating that an offer (e.g. Jingle
    // session-initiate) was received.
    CALL_INCOMING = 'xmpp.callincoming.jingle',

    CHAT_ERROR_RECEIVED = 'xmpp.chat_error_received',

    // The conference properties (as advertised by jicofo) have changed
    CONFERENCE_PROPERTIES_CHANGED = 'xmpp.conference_properties_changed',

    /**
     * Event fired when conference creation timestamp is received.
     */
    CONFERENCE_TIMESTAMP_RECEIVED = 'xmpp.conference_timestamp_received',

    /**
     * This event is triggered when the ICE connects for the first time.
     */
    CONNECTION_ESTABLISHED = 'xmpp.connection.connected',

    // Designates an event indicating that the connection to the XMPP server
    // failed.
    CONNECTION_FAILED = 'xmpp.connection.failed',

    // Designates an event indicating that the media (ICE) connection failed.
    // This should go to the RTC module.
    CONNECTION_ICE_FAILED = 'xmpp.connection.ice.failed',

    // Designates an event indicating that the media (ICE) connection was
    // interrupted. This should go to the RTC module.
    CONNECTION_INTERRUPTED = 'xmpp.connection.interrupted',

    // Designates an event indicating that the media (ICE) connection was
    // restored. This should go to the RTC module.
    CONNECTION_RESTORED = 'xmpp.connection.restored',

    /**
     * Designates an event indicating connection status changes.
     */
    CONNECTION_STATUS_CHANGED = 'xmpp.connection.status.changed',

    // Designates an event indicating that the display name of a participant
    // has changed.
    DISPLAY_NAME_CHANGED = 'xmpp.display_name_changed',

    /**
     * Event for incoming presence error which is for required display name.
     */
    DISPLAY_NAME_REQUIRED = 'xmpp.display_name_required',

    /**
     * Chat room instance have been added to Strophe.emuc plugin.
     */
    EMUC_ROOM_ADDED = 'xmpp.emuc_room_added',

    /**
     * Chat room instance have been removed from Strophe.emuc plugin.
     */
    EMUC_ROOM_REMOVED = 'xmpp.emuc_room_removed',

    ETHERPAD = 'xmpp.etherpad',

    /**
     * Event fired when we receive a message for files sharing.
     */
    FILE_SHARING_EVENT = 'xmpp.files-sharing.event',

    /**
     * Event emitted when a list file is received in the conference.
     */
    FILE_SHARING_FILES_RECEIVED = 'xmpp.files-sharing.list',

    /**
     * Event emitted when a file is added to the conference.
     */
    FILE_SHARING_FILE_ADDED = 'xmpp.files-sharing.add',

    /**
     * Event emitted when a file is removed from the conference.
     */
    FILE_SHARING_FILE_REMOVED = 'xmpp.files-sharing.remove',

    FOCUS_DISCONNECTED = 'xmpp.focus_disconnected',

    FOCUS_LEFT = 'xmpp.focus_left',

    GRACEFUL_SHUTDOWN = 'xmpp.graceful_shutdown',

    // Designates an event indicating that the local ICE connection state has
    // changed.
    ICE_CONNECTION_STATE_CHANGED = 'xmpp.ice_connection_state_changed',

    // Designates an event indicating that an invite XMPP message in the MUC was
    // received.
    INVITE_MESSAGE_RECEIVED = 'xmpp.invite_message_received',

    /**
     * Event which is emitted when the body in an XMPP message in the MUC
     * contains JSON
     * TODO: this event contains a typo (xmmp vs xmpp) but it's unlikely this can be changed now
     */
    JSON_MESSAGE_RECEIVED = 'xmmp.json_message_received',

    /**
     * Designates an event indicating that we were kicked from the XMPP MUC.
     * @param {boolean} isSelfPresence - whether it is for local participant
     * or another participant.
     * @param {string} actorJid - the jid of the participant who was initiator
     * of the kick.
     * @param {?string} participantJid - when it is not a kick for local participant,
     * this is the jid of the participant which was kicked.
     */
    KICKED = 'xmpp.kicked',

    // Designates an event indicating that our role in the XMPP MUC has changed.
    LOCAL_ROLE_CHANGED = 'xmpp.localrole_changed',

    /**
     * Event fired when the unique meeting id is set.
     */
    MEETING_ID_SET = 'xmpp.meeting_id_set',

    // Designates an event indicating that an XMPP message in the MUC was
    // received.
    MESSAGE_RECEIVED = 'xmpp.message_received',

    // Designates an event indicating that a participant was denied access to a conference from the lobby XMPP MUC.
    MUC_DENIED_ACCESS = 'xmpp.muc_denied access',

    // Designates an event indicating that the XMPP MUC was destroyed.
    MUC_DESTROYED = 'xmpp.muc_destroyed',

    // Designates an event indicating that we have joined the XMPP MUC.
    MUC_JOINED = 'xmpp.muc_joined',

    // Designates an event indicating that we are currently in process of joining the XMPP MUC.
    MUC_JOIN_IN_PROGRESS = 'xmpp.muc_join_in_progress',

    // Designates an event indicating that local participant left the muc
    MUC_LEFT = 'xmpp.muc_left',

    // Designates an event indicating that a participant joined the lobby XMPP MUC.
    MUC_LOBBY_MEMBER_JOINED = 'xmpp.muc_lobby_member_joined',

    // Designates an event indicating that a participant left the XMPP MUC.
    MUC_LOBBY_MEMBER_LEFT = 'xmpp.muc_lobby_member_left',

    // Designates an event indicating that a participant in the lobby XMPP MUC has been updated
    MUC_LOBBY_MEMBER_UPDATED = 'xmpp.muc_lobby_member_updated',

    // Designates an event indicating that the MUC has been locked or unlocked.
    MUC_LOCK_CHANGED = 'xmpp.muc_lock_changed',

    // Designates an event indicating that the MUC members only config has changed.
    MUC_MEMBERS_ONLY_CHANGED = 'xmpp.muc_members_only_changed',

    // Designates an event indicating that a bot participant type had changed
    MUC_MEMBER_BOT_TYPE_CHANGED = 'xmpp.muc_member_bot_type_changed',

    // Designates an event indicating that a participant joined the XMPP MUC.
    MUC_MEMBER_JOINED = 'xmpp.muc_member_joined',

    // Designates an event indicating that a participant left the XMPP MUC.
    MUC_MEMBER_LEFT = 'xmpp.muc_member_left',

    // Designates an event indicating that the MUC role of a participant has
    // changed.
    MUC_ROLE_CHANGED = 'xmpp.muc_role_changed',

    // Designates an event indicating that the MUC visitors support has changed.
    MUC_VISITORS_SUPPORTED_CHANGED = 'xmpp.muc_visitors_supported_changed',

    // Designates an event indicating that a participant in the XMPP MUC has
    // advertised that they have audio muted (or unmuted).
    PARTICIPANT_AUDIO_MUTED = 'xmpp.audio_muted',

    /**
     * Indicates that the features of the participant has been changed.
     */
    PARTICIPANT_FEATURES_CHANGED = 'xmpp.participant_features_changed',

    // Designates an event indicating that a participant in the XMPP MUC has
    // advertised that they have video muted (or unmuted).
    PARTICIPANT_VIDEO_MUTED = 'xmpp.video_muted',

    // Designates an event indicating that the video type (e.g. 'camera' or
    // 'screen') for a participant has changed.
    // Note = currently this event fires every time we receive presence from
    // someone (regardless of whether or not the "video type" changed).
    PARTICIPANT_VIDEO_TYPE_CHANGED = 'xmpp.video_type',

    PASSWORD_REQUIRED = 'xmpp.password_required',

    /**
     * Event fired when we receive a self-presence with permissions.
     */
    PERMISSIONS_RECEIVED = 'xmpp.permissions_received',

    /**
     * Indicates that phone number changed.
     */
    PHONE_NUMBER_CHANGED = 'conference.phoneNumberChanged',
    PRESENCE_RECEIVED = 'xmpp.presence_received',
    PRESENCE_STATUS = 'xmpp.presence_status',

    // Designates an event indicating that a private XMPP message in the MUC was
    // received.
    PRIVATE_MESSAGE_RECEIVED = 'xmpp.private_message_received',
    PROMPT_FOR_LOGIN = 'xmpp.prompt_for_login',

    // Designates an event indicating that a reaction XMPP message in the MUC
    // was received.
    REACTION_RECEIVED = 'xmpp.reaction_received',

    // xmpp is connected and obtained user media
    READY_TO_JOIN = 'xmpp.ready_to_join',

    /**
     * Indicates that recording state changed.
     */
    RECORDER_STATE_CHANGED = 'xmpp.recorderStateChanged',

    // Designates an event indicating that we received statistics from a
    // participant in the MUC.
    REMOTE_STATS = 'xmpp.remote_stats',

    RESERVATION_ERROR = 'xmpp.room_reservation_error',

    ROOM_CONNECT_ERROR = 'xmpp.room_connect_error',

    ROOM_CONNECT_MEMBERS_ONLY_ERROR = 'xmpp.room_connect_error.members_only',

    ROOM_CONNECT_NOT_ALLOWED_ERROR = 'xmpp.room_connect_error.not_allowed',

    ROOM_DISCO_INFO_FAILED = 'xmpp.room_disco_info_failed',

    /**
     * Indicates that we have received a reply to our disco-info request for the room.
     */
    ROOM_DISCO_INFO_UPDATED = 'xmpp.room_disco_info_updated',

    ROOM_JOIN_ERROR = 'xmpp.room_join_error',

    /**
     * Indicates that max users limit has been reached.
     */
    ROOM_MAX_USERS_ERROR = 'xmpp.room_max_users_error',

    /**
     * Event fired when we receive a message related to room metadata.
     */
    ROOM_METADATA_EVENT = 'xmpp.room-metadata.event',

    /**
     * Event fired when we receive a message related to room metadata.
     */
    ROOM_METADATA_UPDATED = 'xmpp.room-metadata.updated',

    // Designates an event indicating that we sent an XMPP message to the MUC.
    SENDING_CHAT_MESSAGE = 'xmpp.sending_chat_message',

    // Designates an event indicating that we sent a private XMPP message to
    // a specific user of the muc.
    SENDING_PRIVATE_CHAT_MESSAGE = 'xmpp.sending_private_chat_message',

    /**
     * Event fired after receiving the confirmation about session accept.
     */
    SESSION_ACCEPT = 'xmpp.session_accept',

    /**
     * Event fired if we receive an error after sending the session accept.
     */
    SESSION_ACCEPT_ERROR = 'xmpp.session_accept_error',

    /**
     * Event fired when we do not get our 'session-accept' acknowledged by
     * Jicofo. It most likely means that there is serious problem with our
     * connection or XMPP server and we should reload the conference.
     *
     * We have seen that to happen in BOSH requests race condition when the BOSH
     * request table containing the 'session-accept' was discarded by Prosody.
     * Jicofo does send the RESULT immediately without any condition, so missing
     * packets means that most likely it has never seen our IQ.
     */
    SESSION_ACCEPT_TIMEOUT = 'xmpp.session_accept_timeout',

    SETTINGS_ERROR_RECEIVED = 'xmpp.settings_error_received',

    /**
     * Event fired when participant joins a meeting without audio.
     */
    SILENT_STATUS_CHANGED = 'xmpp.silent_status_changed',

    /**
     * Event fired after successful sending of jingle source-add.
     */
    SOURCE_ADD = 'xmpp.source_add',

    /**
     * Event fired after receiving an error sending of jingle source-add.
     */
    SOURCE_ADD_ERROR = 'xmpp.source_add_error',

    /**
     * Event fired after successful sending of jingle source-remove.
     */
    SOURCE_REMOVE = 'xmpp.source_remove',

    /**
     * Event fired after receiving an error sending of jingle source-remove.
     */
    SOURCE_REMOVE_ERROR = 'xmpp.source_remove_error',

    /**
     * Event fired when speaker stats update message is received.
     */
    SPEAKER_STATS_RECEIVED = 'xmpp.speaker_stats_received',

    // Designates an event indicating that the subject of the XMPP MUC has
    // changed.
    SUBJECT_CHANGED = 'xmpp.subject_changed',

    // FIXME: how does it belong to XMPP ? - it's detected by the PeerConnection
    // suspending detected
    SUSPEND_DETECTED = 'xmpp.suspend_detected',

    /**
     * Notifies for transcription status changes. The event provides the
     * following parameters to its listeners:
     *
     * @param {String} status - The new status.
     */
    TRANSCRIPTION_STATUS_CHANGED = 'xmpp.transcription_status_changed',

    /**
     * Event fired when 'transport-info' with new ICE candidates is received.
     */
    TRANSPORT_INFO = 'xmpp.transportinfo.jingle',

    // Designates an event indicating that the focus has asked us to disable our
    // camera.
    VIDEO_MUTED_BY_FOCUS = 'xmpp.video_muted_by_focus',

    /**
     * Indicates that video SIP GW state changed.
     *
     * @param {VideoSIPGWStatusConstants} status - Any of the following statuses:
     * STATUS_BUSY, STATUS_AVAILABLE or STATUS_UNDEFINED.
     */
    VIDEO_SIP_GW_AVAILABILITY_CHANGED = 'xmpp.videoSIPGWAvailabilityChanged',

    /**
     * Indicates that video SIP GW Session state changed.
     * The statuses are any of the following statuses:
     * STATE_ON, STATE_OFF, STATE_PENDING, STATE_RETRYING, STATE_FAILED.
     * {@see VideoSIPGWStateConstants}
     *
     * @param {options} event - {address, oldState, newState, displayName}.
     */
    VIDEO_SIP_GW_SESSION_STATE_CHANGED = 'xmpp.videoSIPGWSessionStateChanged',

    /**
     * Event indicating we have received a message from the visitors component.
     */
    VISITORS_MESSAGE = 'xmpp.visitors_message',

    /**
     * Event indicating that our request for promotion was rejected.
     */
    VISITORS_REJECTION = 'xmpp.visitors_rejection',

}
