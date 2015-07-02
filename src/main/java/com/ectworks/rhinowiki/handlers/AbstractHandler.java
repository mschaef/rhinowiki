package com.ectworks.rhinowiki.handlers;

import java.io.IOException;
import java.io.OutputStream;

import java.util.Iterator;
import java.util.List;
import java.util.Set;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import org.apache.log4j.Logger;

public abstract class AbstractHandler implements HttpHandler
{
    static Logger log = Logger.getLogger(AbstractHandler.class.getName());

    private String _rootPath = null;

    public void setRoot(String rootPath)
        throws Exception
    {
        if (_rootPath != null)
            throw new Exception("Attempd to set another root (" + rootPath + ") on " + this + ", which is already rooted at " + _rootPath + ".");

        _rootPath = rootPath;
    }

    public String getRoot()
    {
        return (_rootPath == null) ? "" : _rootPath;
    }

    public void logHeaders(StandardExchange exchange)
        throws IOException
    {
        // TODO: This should be totally bypassed when debug logging is off.

        Headers requestHeaders = exchange.getRequestHeaders();

        Set<String> keySet = requestHeaders.keySet();
        Iterator<String> iter = keySet.iterator();
        while (iter.hasNext()) {
            String key = iter.next();
            List values = requestHeaders.get(key);

            log.debug(exchange + " Header: " + key + " = " + values.toString());
        }

    }

    protected abstract void doHandle(StandardExchange exchange) throws Exception;

    // TODO: Standard error handling (redirect to error template, etc.)

    public void errorRedirect(StandardExchange exchange)
    {
        try {
            exchange.respondRedirect("/_error");
        } catch(Exception ex) {
            log.error("Error while redirecting to error page.", ex);
        }
    }

    public void handle(HttpExchange nativeExchange)
        throws IOException
    {
        if (_rootPath == null)
            log.warn(this + " unrooted. Missing call to setRoot?");

        StandardExchange exchange = null;

        try {
            exchange = new StandardExchange(nativeExchange, getRoot());

            logHeaders(exchange);

            doHandle(exchange);
        } catch(Exception ex) {
            log.error("Error handling request: " + exchange.getFullPath(), ex);

            errorRedirect(exchange);
        }
    }
}
