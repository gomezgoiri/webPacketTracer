package uk.ac.open.kmi.forge.webPacketTracer.gateway;

import com.cisco.pt.ipc.IPCError;

import java.io.IOException;
import java.util.concurrent.Callable;

import org.apache.commons.lang3.exception.ExceptionUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import uk.ac.open.kmi.forge.webPacketTracer.api.http.exceptions.PacketTracerConnectionException;
import uk.ac.open.kmi.forge.webPacketTracer.api.http.exceptions.SessionNotFoundException;
import uk.ac.open.kmi.forge.webPacketTracer.session.PTInstanceDetails;
import uk.ac.open.kmi.forge.webPacketTracer.session.SessionManager;


public abstract class PTCallable<V> implements Callable<V> {

    private static final Log LOGGER = LogFactory.getLog(PTCallable.class);

    final SessionManager sm;

    /**
     * This object can be used inside internalRun method, but not outside as it might not be initialized.
     */
    protected PTConnection connection;

    public PTCallable(SessionManager sm) {
        this.sm = sm;
    }

    // When in a Future, it returns exception wrapped in an ExecutionException
    @Override
    public V call() throws SessionNotFoundException, PacketTracerConnectionException {
        final PTInstanceDetails details = this.sm.getInstance();
        this.connection = PTConnection.createPacketTracerGateway(details.getHost(), details.getPort());
        try {
            this.connection.before();
            return internalRun();
        } catch (IPCError ipcError) {
            this.connection.getLog().error("\n\n\nAn IPC error occurred:\n\t" + ipcError.getMessage() + "\n\n\n");
            throw new PacketTracerConnectionException(ipcError.getMessage(), ipcError);
        } catch(IOException io) {
            throw new PacketTracerConnectionException(io.getMessage(), io);
        } catch (PacketTracerConnectionException ptce) {
            throw ptce;
        } catch (Throwable t) {
            if (t instanceof ThreadDeath) {
                throw ((ThreadDeath) t);
            }
            LOGGER.error(t);
            return null;
        } finally {
            this.connection.close();
        }
    }

    public abstract V internalRun();
}
