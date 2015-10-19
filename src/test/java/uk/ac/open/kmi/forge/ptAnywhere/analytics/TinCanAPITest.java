package uk.ac.open.kmi.forge.ptAnywhere.analytics;


import com.rusticisoftware.tincan.Statement;
import org.json.JSONException;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;
import org.skyscreamer.jsonassert.JSONAssert;
import uk.ac.open.kmi.forge.ptAnywhere.analytics.vocab.BaseVocabulary;
import java.net.MalformedURLException;


public class TinCanAPITest {

    final static String WIDGETURI = "http://testuri/";
    final static String SESSIONID = "b8d5exozT9eNsR1udGjbZQ--";
    final static String SESSIONUUID = "6fc7797b-1a33-4fd7-8db1-1d6e7468db65";
    final static String DEVICE1URI = "http://device1";
    final static String DEVICE2URI = "http://device2";
    final static String DEVICENAME = "Device One";
    final static String DEVICETYPE = "router";
    final static String LINKURI = "http://coolLink1234";
    final static String[] ENDPOINTURLS = new String[] {DEVICE1URI, DEVICE2URI};
    final static String COMMANDLINE_TEXT = "ping 127.0.0.1";

    TestableTinCanAPI testable;

    @Before
    public void setUp() throws MalformedURLException {
        this.testable = new TestableTinCanAPI();
        this.testable.setURIFactory(new URIFactory(WIDGETURI));
        this.testable.setSession(SESSIONID);
    }

    protected String getJson(String field, String valueInJson) {
        return "{\"" + field + "\":" + valueInJson + "}";
    }

    protected void assertContains(String field, String expectedJsonInField, String gotJson) throws JSONException {
        JSONAssert.assertEquals(getJson(field, expectedJsonInField), gotJson, false);
    }

    protected String getExpectedActor() {
        return "{\"objectType\":\"Agent\",\"account\":" +
                "{\"homePage\":\"http://forge.kmi.open.ac.uk/pt/widget\",}}";
    }

    protected String getExpectedVerb(String verb) {
        return "{\"id\":\"" + verb + "\"}";
    }

    protected String getExpectedContext() {
        return getJson("registration",  "\"" + SESSIONUUID + "\"");
    }

    protected String getExpectedContext(String parentActivity) {
        return this.getExpectedContext(parentActivity, BaseVocabulary.SIMULATION);
    }

    protected String getExpectedContext(String parentActivity, String parentType) {
        final String generalContext = getExpectedContext();
        return generalContext.substring(0, generalContext.length()-1) + // To open closed {}
                ",\"contextActivities\":{\"parent\":[{\"objectType\":\"Activity\",\"id\":\"" + parentActivity +
                "\",\"definition\":{\"type\":\"" + parentType + "\"}}]}}";
    }

    protected String getExpectedActivity(String id, String type) {
        return getExpectedActivity(id, type, null);
    }

    protected String getExpectedActivity(String id, String type, String enDefinition) {
        final String extraChunk = (enDefinition==null)? "" : ", \"name\": {\"en-GB\":\"" + enDefinition + "\"}";
        return "{\"objectType\":\"Activity\",\"id\":\"" + id +
                "\",\"definition\":{\"type\":\"" + type + "\"" + extraChunk + "}}";
    }


    protected void assertNotContains(String field, String gotJson) throws JSONException {
        assertFalse(gotJson.contains("\"" + field + "\":{"));
    }

    @Test
    public void testInteractionStarted() throws JSONException {
        this.testable.interactionStarted();
        final String jsonGenerated = this.testable.statementToRecord.toJSON();
        assertContains("actor", getExpectedActor(), jsonGenerated);
        assertContains("verb", getExpectedVerb(BaseVocabulary.INITIALIZED), jsonGenerated);
        assertContains("object", getExpectedActivity(WIDGETURI, BaseVocabulary.SIMULATION), jsonGenerated);
        assertContains("context", getExpectedContext(), jsonGenerated);
        assertNotContains("result", jsonGenerated);
    }

    protected String getExtension(String extUri, String extValue) {
        // Quick check to detect if the value is not already a JSON...
        if (!extValue.startsWith("[") && !extValue.startsWith("{") && !extValue.startsWith("\"") ) {
            extValue = "\"" + extValue + "\"";
        }
        return "\"" + extUri + "\":" + extValue;
    }

    protected String getExpectedResult(String response, String[]... extensions) {
        String ret = "{\"response\":\"" + response + "\"";
        if (extensions.length>0) {
            ret += ",\"extensions\":{";
            for( String[] extension: extensions) {
                ret += getExtension(extension[0], extension[1]) + ",";
            }
            ret = ret.substring(0, ret.length()-1) + "}";
        }
        return ret + "}";
    }

    @Test
    public void testDeviceCreated() throws JSONException {
        this.testable.deviceCreated(DEVICE1URI, DEVICENAME, DEVICETYPE);
        final String jsonGenerated = this.testable.statementToRecord.toJSON();
        assertContains("actor", getExpectedActor(), jsonGenerated);
        assertContains("verb", getExpectedVerb(BaseVocabulary.CREATED), jsonGenerated);
        assertContains("object", getExpectedActivity(BaseVocabulary.SIMULATED_DEVICE + "/" + DEVICETYPE, BaseVocabulary.SIMULATION, "Simulated router"), jsonGenerated);
        assertContains("context", getExpectedContext(WIDGETURI), jsonGenerated);
        final String[][] exts = new String[][] {
                {BaseVocabulary.EXT_DEVICE_NAME, DEVICENAME},
                {BaseVocabulary.EXT_DEVICE_URI, DEVICE1URI},
                {BaseVocabulary.EXT_DEVICE_TYPE, DEVICETYPE}
        };
        assertContains("result", getExpectedResult(DEVICENAME, exts), jsonGenerated);
    }

    @Test
    public void testDeviceDeleted() throws JSONException {
        this.testable.deviceDeleted(DEVICE1URI, DEVICENAME, DEVICETYPE);
        final String jsonGenerated = this.testable.statementToRecord.toJSON();
        assertContains("actor", getExpectedActor(), jsonGenerated);
        assertContains("verb", getExpectedVerb(BaseVocabulary.DELETED), jsonGenerated);
        assertContains("object", getExpectedActivity(BaseVocabulary.SIMULATED_DEVICE + "/" + DEVICETYPE, BaseVocabulary.SIMULATION, "Simulated router"), jsonGenerated);
        assertContains("context", getExpectedContext(WIDGETURI), jsonGenerated);
        final String[][] exts = new String[][] {
                {BaseVocabulary.EXT_DEVICE_NAME, DEVICENAME},
                {BaseVocabulary.EXT_DEVICE_URI, DEVICE1URI},
                {BaseVocabulary.EXT_DEVICE_TYPE, DEVICETYPE}
        };
        assertContains("result", getExpectedResult(DEVICENAME, exts), jsonGenerated);
    }

    @Test
    public void deviceModified() throws JSONException {
        this.testable.deviceModified(DEVICE1URI, DEVICENAME, DEVICETYPE);
        final String jsonGenerated = this.testable.statementToRecord.toJSON();
        assertContains("actor", getExpectedActor(), jsonGenerated);
        assertContains("verb", getExpectedVerb(BaseVocabulary.UPDATED), jsonGenerated);
        assertContains("object", getExpectedActivity(BaseVocabulary.SIMULATED_DEVICE + "/" + DEVICETYPE, BaseVocabulary.SIMULATION, "Simulated router"), jsonGenerated);
        assertContains("context", getExpectedContext(WIDGETURI), jsonGenerated);
        final String[][] exts = new String[][] {
                {BaseVocabulary.EXT_DEVICE_NAME, DEVICENAME},
                {BaseVocabulary.EXT_DEVICE_URI, DEVICE1URI},
                {BaseVocabulary.EXT_DEVICE_TYPE, DEVICETYPE}
        };
        assertContains("result", getExpectedResult(DEVICENAME, exts), jsonGenerated);
    }

    protected String toJsonArray(String... elements) {  // TODO We could perfectly do it with the JSON library
        String ret = "[";
        for(String el: elements) {
            ret += "\"" + el + "\",";
        }
        return ret.substring(0, ret.length()-1) + "]";
    }

    @Test
    public void deviceConnected() throws JSONException {
        this.testable.deviceConnected(LINKURI, ENDPOINTURLS);
        final String jsonGenerated = this.testable.statementToRecord.toJSON();
        assertContains("actor", getExpectedActor(), jsonGenerated);
        assertContains("verb", getExpectedVerb(BaseVocabulary.CREATED), jsonGenerated);
        assertContains("object", getExpectedActivity(BaseVocabulary.SIMULATED_LINK, BaseVocabulary.SIMULATION, "Link"), jsonGenerated);
        assertContains("context", getExpectedContext(WIDGETURI), jsonGenerated);
        final String[][] exts = new String[][] {
                {BaseVocabulary.EXT_ENDPOINTS, toJsonArray(ENDPOINTURLS)},
                {BaseVocabulary.EXT_LINK_URI, LINKURI}
        };
        assertContains("result", getExpectedResult(LINKURI, exts), jsonGenerated);
    }

    @Test
    public void deviceDisconnected() throws JSONException {
        this.testable.deviceDisconnected(LINKURI, ENDPOINTURLS);
        final String jsonGenerated = this.testable.statementToRecord.toJSON();
        assertContains("actor", getExpectedActor(), jsonGenerated);
        assertContains("verb", getExpectedVerb(BaseVocabulary.DELETED), jsonGenerated);
        assertContains("object", getExpectedActivity(BaseVocabulary.SIMULATED_LINK, BaseVocabulary.SIMULATION, "Link"), jsonGenerated);
        assertContains("context", getExpectedContext(WIDGETURI), jsonGenerated);
        final String[][] exts = new String[][] {
                {BaseVocabulary.EXT_ENDPOINTS, toJsonArray(ENDPOINTURLS)},
                {BaseVocabulary.EXT_LINK_URI, LINKURI}
        };
        assertContains("result", getExpectedResult(LINKURI, exts), jsonGenerated);
    }

    @Test
    public void commandLineStarted() throws JSONException {
        final String consoleActivityId = WIDGETURI + "device/"  + DEVICENAME.hashCode() + "/console";
        this.testable.commandLineStarted(DEVICENAME);
        final String jsonGenerated = this.testable.statementToRecord.toJSON();
        assertContains("actor", getExpectedActor(), jsonGenerated);
        assertContains("verb", getExpectedVerb(BaseVocabulary.INITIALIZED), jsonGenerated);
        assertContains("object", getExpectedActivity(consoleActivityId, BaseVocabulary.COMMAND_LINE, DEVICENAME + "'s command line"), jsonGenerated);
        assertContains("context", getExpectedContext(WIDGETURI), jsonGenerated);
        assertNotContains("result", jsonGenerated);
    }

    @Test
    public void commandLineUsed() throws JSONException {
        final String consoleActivityId = WIDGETURI + "device/"  + DEVICENAME.hashCode() + "/console";
        this.testable.commandLineUsed(DEVICENAME, COMMANDLINE_TEXT);
        final String jsonGenerated = this.testable.statementToRecord.toJSON();
        assertContains("actor", getExpectedActor(), jsonGenerated);
        assertContains("verb", getExpectedVerb(BaseVocabulary.USED), jsonGenerated);
        assertContains("object", getExpectedActivity(consoleActivityId, BaseVocabulary.COMMAND_LINE, DEVICENAME + "'s command line"), jsonGenerated);
        assertContains("context", getExpectedContext(WIDGETURI), jsonGenerated);
        final String[][] exts = new String[][] {
                {BaseVocabulary.EXT_DEVICE_NAME, DEVICENAME}
        };
        assertContains("result", getExpectedResult(COMMANDLINE_TEXT, exts), jsonGenerated);
    }

    @Test
    public void commandLineEnded() throws JSONException {
        final String consoleActivityId = WIDGETURI + "device/"  + DEVICENAME.hashCode() + "/console";
        this.testable.commandLineEnded(DEVICENAME);
        final String jsonGenerated = this.testable.statementToRecord.toJSON();
        assertContains("actor", getExpectedActor(), jsonGenerated);
        assertContains("verb", getExpectedVerb(BaseVocabulary.TERMINATED), jsonGenerated);
        assertContains("object", getExpectedActivity(consoleActivityId, BaseVocabulary.COMMAND_LINE, DEVICENAME + "'s command line"), jsonGenerated);
        assertContains("context", getExpectedContext(WIDGETURI), jsonGenerated);
        assertNotContains("result", jsonGenerated);
    }
}

class TestableTinCanAPI extends TinCanAPI {

    Statement statementToRecord;

    @Override
    protected void record(final Statement statement) {
        this.statementToRecord = statement;
    }
}