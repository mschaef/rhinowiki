package com.ectworks.rhinowiki.server;

import java.util.concurrent.ThreadFactory;

class ServerThreadFactory implements ThreadFactory
{
    public Thread newThread(Runnable r)
    {
        return new ServerThread(r);
    }
 }
