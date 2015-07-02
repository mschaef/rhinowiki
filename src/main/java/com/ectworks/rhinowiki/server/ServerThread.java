package com.ectworks.rhinowiki.server;

import org.apache.log4j.Logger;

import org.mozilla.javascript.Context;


class ServerThread extends Thread
{
    static Logger log = Logger.getLogger(ServerThread.class.getName());

    public ServerThread(Runnable runnable)
    {
        super(runnable);
    }

    public void run()
    {
        try {
            log.debug("Entering Thread: " + this);

            Context.enter();

            super.run();

            log.debug("Leaving Thread: " + this);

        } catch (Exception ex) {
            log.error("Uncaught Exception: " + ex.getMessage(), ex);
        } finally {
            Context.exit();
        }
    }
}
