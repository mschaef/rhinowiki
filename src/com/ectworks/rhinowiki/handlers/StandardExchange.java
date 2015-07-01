package com.ectworks.rhinowiki.handlers;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.BufferedReader;

import java.util.Iterator;
import java.util.List;
import java.util.Set;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import org.apache.log4j.Logger;

public class StandardExchange
{
    static Logger log = Logger.getLogger(StandardExchange.class.getName());

    private HttpExchange _exchange;
    private String _rootPath;
    private boolean _open;

    public StandardExchange(HttpExchange exchange, String rootPath)
        throws Exception
    {
        if (exchange == null)
            throw new Exception("Cannot create StandardExchange with null exchange.");
        if (rootPath == null)
            throw new Exception("Cannot create StandardExchange with null rootPath.");

        _exchange = exchange;
        _rootPath = rootPath;
        _open = true;

        log.info("Created: " + this);
    }

    public void ensureOpen()
        throws Exception
    {
        if (!_open)
            throw new Exception("Attempt to access closed exchange: " + this);
    }

    public HttpExchange getExchange()
    {
        return _exchange;
    }

    public String getRequestMethod()
    {
        return getExchange().getRequestMethod();
    }

    public String getFullPath()
    {
        return getExchange().getRequestURI().getPath().toString();
    }

    public String getQuery()
    {
        String query = getExchange().getRequestURI().getQuery();

        if (query == null)
            return "";

        return query;
    }

    public String getPath()
        throws Exception
    {
        String fullPath = getFullPath();

        if (!fullPath.regionMatches(0, _rootPath, 0, _rootPath.length()))
            throw new Exception("Request: " + this + " on unexpected root: \"" + _rootPath + "\".");

        return fullPath.substring(_rootPath.length());
    }

    private Headers _requestHeaders;

    public Headers getRequestHeaders()
    {
        if (_requestHeaders == null)
            _requestHeaders = getExchange().getRequestHeaders();

        return _requestHeaders;
    }

    public Object[] getRequestHeaderKeys()
    {
        return getRequestHeaders().keySet().toArray();
    }

    public InputStream getRequestBody()
    {
        return getExchange().getRequestBody();
    }

    public String getRequestBodyAsString()
        throws IOException
    {
        BufferedReader in = new BufferedReader(new InputStreamReader(getRequestBody()));
        StringBuilder out = new StringBuilder();

        while(true) {
            String line = in.readLine();

            if (line == null)
                break;

            out.append(line);
            out.append("\n");
        }

        return out.toString();
    }
    
    public void respondRedirect(String target)
        throws IOException, Exception
    {
        ensureOpen();

        log.info("301 - Redirect: " + this + " to " + target);

        getExchange().getResponseHeaders().set("Location", target);
        getExchange().sendResponseHeaders(301, 0);

        close();
    }

    public void respondNotFound()
        throws IOException, Exception
    {
        ensureOpen();

        log.info("404 - Not Found: " + this);

        getExchange().sendResponseHeaders(404, 0);

        close();
    }

    public void respondSuccess()
        throws IOException, Exception
    {
        ensureOpen();

        log.info("200 - Ok (no content): " + this);

        getExchange().sendResponseHeaders(200, 0);

        close();
    }

    public void respondHeadersOnly(String mimeType)
        throws IOException, Exception
    {
        ensureOpen();

        log.info("200 - Ok (Headers Only): " + this);
        log.debug("mimeType: " + mimeType);

        getExchange().getResponseHeaders().set("Content-Type", mimeType);
        getExchange().sendResponseHeaders(200, 0);

        close();
    }

    public void respondContent(String mimeType, byte[] content)
        throws IOException, Exception
    {
        ensureOpen();

        log.info("200 - Ok: " + this);
        log.debug("mimeType: " + mimeType + ", bytes: " + content.length);

        getExchange().getResponseHeaders().set("Content-Type", mimeType);
        getExchange().sendResponseHeaders(200, 0);
        getExchange().getResponseBody().write(content);

        close();
    }

    public void respondContent(String mimeType, String content)
        throws IOException, Exception
    {
        ensureOpen();

        log.info("200 - Ok: " + this);
        log.debug("mimeType: " + mimeType + ", content: " + content);

        getExchange().getResponseHeaders().set("Content-Type", mimeType);
        getExchange().sendResponseHeaders(200, 0);
        getExchange().getResponseBody().write(content.getBytes());

        close();
    }


    public void close()
        throws Exception
    {
        ensureOpen();

        log.debug("Closing: " + this);

        getExchange().close();

        _open = false;
    }

    public String toString() 
    {
        String path;

        try {
            path = getPath();
        } catch (Exception ex) {
            path = "ON-UNEXPECTED-ROOT: " + getFullPath();
        }

        return "[" + (_open ? "" : "(CLOSED) ") + "StandardExchange: " + getRequestMethod() + " @ " + path + "]";
    }
}
