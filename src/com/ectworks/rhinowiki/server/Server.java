package com.ectworks.rhinowiki.server;

import java.io.IOException;
import java.net.InetSocketAddress;

import java.util.concurrent.Executors;

import com.sun.net.httpserver.HttpServer;

import org.apache.log4j.Logger;

import org.mozilla.javascript.ScriptableObject;

import com.ectworks.rhinowiki.handlers.AbstractHandler;
import com.ectworks.rhinowiki.handlers.JSDelegateHandler;
import com.ectworks.rhinowiki.handlers.StaticContentHandler;

public class Server
{
    static Logger log = Logger.getLogger(Server.class.getName());

    private HttpServer _httpServer = null;

    int _port;

    public Server(int port)
        throws IOException
    {
        _port = port;

        InetSocketAddress addr = new InetSocketAddress(_port);

        _httpServer = HttpServer.create(addr, 0);

        _httpServer.setExecutor(Executors.newCachedThreadPool(new ServerThreadFactory()));
    }

    public AbstractHandler addHandler(String path, AbstractHandler handler)
        throws Exception
    {
        handler.setRoot(path);

        _httpServer.createContext(path, handler);

        return handler;
    }

    public AbstractHandler addJSDelegateContext(String path, ScriptableObject jsDelegate)
        throws Exception
    {
        return addHandler(path, new JSDelegateHandler(jsDelegate));
    }

    public AbstractHandler addStaticContext(String path, String fileRootPath)
        throws Exception
    {
        return addHandler(path, new StaticContentHandler(fileRootPath));
    }

    public void run() throws IOException
    {
        _httpServer.start();
 
        log.info("Server is listening on port " + _port);        
    }

    private Object _shutdownSignal = new Object();

    public void waitForShutdownSignal()
    {
        try {
            synchronized(_shutdownSignal) {
                _shutdownSignal.wait();
            }
        } catch (InterruptedException ex) {
            log.error("Shutdown signal wait interrupted.", ex);
        }
    }

    public void signalShutdown()
    {
        synchronized(_shutdownSignal) {
            _shutdownSignal.notifyAll();
        }
    }

    public void stop(int delay)
    {
        log.info("Server stopping.");

        _httpServer.stop(delay);

        log.info("Server stopped");
    }
}
