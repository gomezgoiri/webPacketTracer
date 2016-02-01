package uk.ac.open.kmi.forge.ptAnywhere.session.impl;

import org.apache.http.impl.conn.PoolingHttpClientConnectionManager;
import org.glassfish.jersey.client.ClientConfig;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;
import uk.ac.open.kmi.forge.ptAnywhere.PoolManager;
import uk.ac.open.kmi.forge.ptAnywhere.properties.RedisConnectionProperties;
import uk.ac.open.kmi.forge.ptAnywhere.session.ExpirationSubscriber;
import uk.ac.open.kmi.forge.ptAnywhere.session.SessionsManagerFactory;
import javax.ws.rs.client.ClientBuilder;


public class MultipleSessionsManagerFactory implements SessionsManagerFactory {
    // Pool usage recommended in the official documentation:
    //   "You can store the pool somewhere statically, it is thread-safe."
    protected final JedisPool pool;
    protected final int maxLength;
    protected final int dbNumber;

    final ClientConfig reusableClientConfiguration;
    final PoolingHttpClientConnectionManager connectionManager;


    public MultipleSessionsManagerFactory(RedisConnectionProperties redis, int maximumLength) {
        this.maxLength = maximumLength;
        this.dbNumber = redis.getDbNumber();
        // 2000 and null are the default values used in JedisPool...
        this.pool = new JedisPool(new JedisPoolConfig(), redis.getHostname(), redis.getPort(), 2000, null, this.dbNumber);

        this.reusableClientConfiguration = PoolManager.getApacheClientConfig();
        this.connectionManager = PoolManager.configureClientPool(this.reusableClientConfiguration);
    }

    /*
     * Creates an http client probably taking it from the pool.
     *
     * From the ApacheConnector documentation:
     *  "Client operations are thread safe, the HTTP connection may be shared between different threads."
     */
    private javax.ws.rs.client.Client createReusableClient() {
        return ClientBuilder.newClient(this.reusableClientConfiguration);
    }

    @Override
    public MultipleSessionsManager create() {
        return new MultipleSessionsManager(this.pool, this.dbNumber, this.maxLength, createReusableClient());
    }

    /**
     * WARNING: Returns a runnable which calls to a Jedis blocking operation.
     */
    @Override
    public ExpirationSubscriber createExpirationSubscription() {
        return new ExpirationSubscriberImpl(create(), this.dbNumber, this.pool);
    }

    @Override
    public void destroy() {
        this.pool.destroy();
        // From this moment on, the operations will throw an exception.
        // Hopefully, there would not be any MultipleSessionsManagers being used.
        this.connectionManager.close();
    }
}
