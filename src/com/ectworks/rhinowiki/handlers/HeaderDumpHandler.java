package com.ectworks.rhinowiki.handlers;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

import java.util.Iterator;
import java.util.List;
import java.util.Set;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpHandler;

import org.apache.log4j.Logger;

public class HeaderDumpHandler extends AbstractHandler
{
    static Logger log = Logger.getLogger(HeaderDumpHandler.class.getName());

    protected void dumpln(StringBuilder out, String msg)
        throws IOException
    {
        out.append(msg + "\n");

        log.info(msg);
    }

    public void dumpHeaders(StringBuilder out, StandardExchange exchange)
        throws IOException
    {
        Headers requestHeaders = exchange.getRequestHeaders();

        Set<String> keySet = requestHeaders.keySet();
        Iterator<String> iter = keySet.iterator();
        while (iter.hasNext()) {
            String key = iter.next();
            List values = requestHeaders.get(key);

            dumpln(out, key + " = " + values.toString());
        }

    }

    public void doHandle(StandardExchange exchange)
        throws Exception
    {
        log.info("Handling: " + exchange);

        StringBuilder responseBody = new StringBuilder();

        dumpln(responseBody, "Method: " + exchange.getRequestMethod());
        dumpln(responseBody, "FullPath: " + exchange.getFullPath());
        try {
            dumpln(responseBody, "Path: " + exchange.getPath());
        } catch(Exception ex) {
            log.error("Exception thrown while computing path.", ex);
        }

        dumpln(responseBody, "======== HEADERS:");
        dumpHeaders(responseBody, exchange);

        dumpln(responseBody, "======== INPUT-BODY:");
        dumpln(responseBody, exchange.getRequestBodyAsString());

        exchange.respondContent("text/plain", responseBody.toString());
    }
}
