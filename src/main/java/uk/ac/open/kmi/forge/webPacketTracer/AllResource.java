package uk.ac.open.kmi.forge.webPacketTracer;

import sun.nio.ch.Net;
import uk.ac.open.kmi.forge.webPacketTracer.gateway.PTCallable;
import uk.ac.open.kmi.forge.webPacketTracer.pojo.Device;
import uk.ac.open.kmi.forge.webPacketTracer.pojo.Network;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

class AllGetter extends PTCallable<Network> {
    @Override
    public Network internalRun() {
        final com.cisco.pt.ipc.sim.Network network = this.task.getIPC().network();
        return Network.fromCiscoObject(network);
    }
}

@Path("all")
public class AllResource {

    private PtSmith ptSmith = null;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Network getAll() {
        return new AllGetter().call();  // No Threads
    }

    public String getJson2() {
        if (ptSmith == null) {
            ptSmith = new PtSmith();
        }
        ptSmith.run();
        String devices = ptSmith.getDevicesJson();
        String edges = ptSmith.getEdgesJson();
        return "{ \n \t\"devices\":" + devices + ",\n \t\"edges\":" + edges + "\n}";
    }
}
