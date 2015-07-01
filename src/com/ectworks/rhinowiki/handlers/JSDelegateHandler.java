package com.ectworks.rhinowiki.handlers;

import java.io.IOException;
import java.io.OutputStream;

import java.util.Iterator;
import java.util.List;
import java.util.Set;

import java.net.URI;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import org.apache.log4j.Logger;

import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

public class JSDelegateHandler extends AbstractHandler
{
    static Logger log = Logger.getLogger(JSDelegateHandler.class.getName());

    private ScriptableObject _jsDelegate = null;

    public ScriptableObject getDelegate()
    {
        return _jsDelegate;
    }

    public JSDelegateHandler(ScriptableObject jsDelegate)
    {
        _jsDelegate = jsDelegate;
    }

    protected Object invokeHandlerMethod(String methodName, Object[] args)
    {
        return ScriptableObject.callMethod(_jsDelegate, methodName, args);
    }

    protected void doHandle(StandardExchange exchange)
        throws Exception
    {
        log.info("Request: " + exchange);

        invokeHandlerMethod("handle" + exchange.getRequestMethod(), new Object[] { exchange });
    }
}
 
