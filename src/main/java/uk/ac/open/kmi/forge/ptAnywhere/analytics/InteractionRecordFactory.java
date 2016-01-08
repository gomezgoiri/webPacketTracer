package uk.ac.open.kmi.forge.ptAnywhere.analytics;

import java.net.MalformedURLException;
import java.util.concurrent.ExecutorService;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import uk.ac.open.kmi.forge.ptAnywhere.analytics.tincanapi.OnePerRegistrationRecorder;
import uk.ac.open.kmi.forge.ptAnywhere.analytics.tincanapi.SimpleStatementRecorder;
import uk.ac.open.kmi.forge.ptAnywhere.properties.InteractionRecordingProperties;


public class InteractionRecordFactory {

    private static final Log LOGGER = LogFactory.getLog(InteractionRecordFactory.class);

    private final ExecutorService executor;  // This executor is not handled by this class.
    private final InteractionRecordingProperties irp;

    private OnePerRegistrationRecorder recorder;

    public InteractionRecordFactory(ExecutorService executor, InteractionRecordingProperties props) {
        this.executor = executor;
        this.irp = props;
        this.recorder = null;
    }

    protected InteractionRecord create() {
        if (this.irp==null) return new NoTracker();
        try {
            if (this.recorder==null) {
                this.recorder = new OnePerRegistrationRecorder(this.irp.getEndpoint(), this.irp.getUsername(), this.irp.getPassword(), this.executor);  // Shared among TinCanAPI objects
            }
            return new TinCanAPI(this.recorder);
        } catch(MalformedURLException e) {
            LOGGER.error(e.getMessage());
            return new NoTracker();
        }
    }

    public InteractionRecord create(String widgetURI, String sessionId) {
        final InteractionRecord ir = create();
        ir.setURIFactory(new URIFactory(widgetURI));
        ir.setSession(sessionId);
        return ir;
    }
}