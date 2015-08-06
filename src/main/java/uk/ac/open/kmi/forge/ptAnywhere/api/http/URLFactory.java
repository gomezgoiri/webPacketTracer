package uk.ac.open.kmi.forge.ptAnywhere.api.http;

import java.net.URI;

// TODO read the following and refactor:
// https://jersey.java.net/documentation/latest/user-guide.html#d0e10659
public class URLFactory {

    static public final String SESSION_PATH = "sessions";
    static public final String SESSION_PARAM = "session";
    static public final String NETWORK_PATH = "network";
    static public final String LINKS_PATH = "links";
    static public final String LINK_PARAM = "link";
    static public final String CONTEXT_PATH = "contexts";
    static public final String CONTEXT_DEVICE_PATH = "device.jsonld";
    static public final String DEVICE_PATH = "devices";
    static public final String DEVICE_PARAM = "device";
    static public final String PORT_PATH = "ports";
    static public final String PORT_PARAM = "port";
    static public final String PORT_LINK_PATH = "link";

    final String baseUri;
    final String sessionId;
    final String deviceId;

    URLFactory(URI baseUri, String sessionId) {
        this.baseUri = Utils.getURIWithSlashRemovingQuery(baseUri);
        this.sessionId = sessionId;
        this.deviceId = null;
    }

    URLFactory(URI baseUri, String sessionId, String deviceId) {
        this.baseUri = Utils.getURIWithSlashRemovingQuery(baseUri);
        this.sessionId = sessionId;
        this.deviceId = deviceId;
    }

    public String getSessionURL() {
        return this.baseUri + SESSION_PATH + "/" + this.sessionId + "/";
    }

    public String getDevicesURL() {
        return getSessionURL() + DEVICE_PATH + "/";
    }

    public String createDeviceURL(String id) {
        return getDevicesURL() + id + "/";
    }

    public String createLinkURL(String id) {
        return getSessionURL() + LINKS_PATH + "/" + id;
    }

    public String createPortsURL() {
        return createDeviceURL(this.deviceId) + PORT_PATH + "/";
    }

    public String createPortURL(String portId) {
        return createPortsURL() + Utils.escapePort(portId) + "/";
    }

    public String createPortURL(String deviceId, String portId) {
        return createDeviceURL(deviceId) + PORT_PATH + "/" + Utils.escapePort(portId) + "/";
    }

    public String createPortLinkURL(String portId) {
        return createPortURL(portId) + PORT_LINK_PATH;
    }

    protected static String extractElement(String url, String id) {
        boolean next = false;
        for(String piece: url.split("/")) {
            if (next) return piece;
            next = piece.equals(id);
        }
        return null;
    }

    public static String parseDeviceId(String url) {
        return extractElement(url, DEVICE_PATH);
    }

    public static String parsePortId(String url) {
        return Utils.unescapePort(extractElement(url, PORT_PATH));
    }
}