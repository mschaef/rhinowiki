package com.ectworks.rhinowiki;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.FileReader;
import java.io.BufferedReader;

import org.apache.log4j.Logger;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import org.mozilla.javascript.WrappedException;
import org.mozilla.javascript.EvaluatorException;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.RhinoException;

public class Main extends ScriptableObject
{
    public static final double RHINOWIKI_VERSION = 0.0;

    static Logger log = Logger.getLogger(Main.class.getName());
    static Logger jsLog = Logger.getLogger("JS");

    public String getClassName()
    {
        return this.getClass().getName();
    }

    static private BufferedReader _stdin = null;

    static public BufferedReader stdin()
    {
        if (_stdin == null)
            _stdin = new BufferedReader(new InputStreamReader(System.in));

        return _stdin;
    }

    public static String parseFilenameArgument(Object[] args)
        throws Exception
    {
        if (args.length != 1) 
            throw new Exception("Expected one argument to specify filename.");

        if (!String.class.isAssignableFrom(args[0].getClass()))
            throw new Exception("Filename must be specified with a string.");

        return (String)args[0];
    }

    public static String consumeIntoString(BufferedReader in)
        throws Exception
    {
        String text = "";

        try {
            String line = null;

            while ((line = in.readLine()) != null)
                text += (line + "\n");

        } finally {
            in.close();
        }

        return text;
    }

    public static String readfile(Context cx, Scriptable thisObj, Object[] args, Function funObj)
        throws Exception
    {
        FileReader is = new FileReader(parseFilenameArgument(args));

        String filetext = "";

        try {
            filetext = consumeIntoString(new BufferedReader(is));
        } finally {
            is.close();
        }
        
        return filetext;
    }

    public static String readres(Context cx, Scriptable thisObj, Object[] args, Function funObj)
        throws Exception
    {
        String resName = parseFilenameArgument(args);

        InputStream is = ClassLoader.getSystemResourceAsStream(resName);

        if (is == null) {
            log.warn("Cannot find JavaScript resource: " + resName);
            return null;
        }

        String restext = "";

        try {
            restext = consumeIntoString(new BufferedReader(new InputStreamReader(is)));
        } finally {
            try {
                is.close();
            } catch (IOException ex) {
                log.error("Error closing input stream for JS resource: " + resName, ex);
            }
        }

        return restext;
    }

    public void loadJSResource(Context cx, String resName)
    {
        Main scope = (Main)getTopLevelScope(this);

        InputStream is = ClassLoader.getSystemResourceAsStream(resName);

        if (is == null) {
            log.warn("Cannot find JavaScript resource: " + resName);
            return;
        }

        log.debug("Loading JavaScript resource: " + resName);

        try {
            BufferedReader in = new BufferedReader(new InputStreamReader(is));

            cx.evaluateReader(scope, in, "res:" + resName, 0, null);

        } catch (Exception ex) {
            log.error("Error while loading JavaScript resource: " + resName, ex);
        } finally {
            try {
                is.close();
            } catch (IOException ex) {
                log.error("Error closing input stream for JS resource: " + resName, ex);
            }
        }

        log.debug("Done loading JavaScript resource: " + resName);
    }

    public static char peekStdin()
        throws IOException
    {
        BufferedReader in = stdin();

        assert in.markSupported();

        char ch;

        in.mark(5);
        try {
            ch = (char)in.read();
        } finally {
            in.reset();
        }

        return ch;
    }

    public static char peek(Context cx, Scriptable thisObj, Object[] args, Function funObj)
        throws IOException
    {
        return peekStdin();
    }


    public static char read(Context cx, Scriptable thisObj, Object[] args, Function funObj)
        throws IOException
    {
        return (char)stdin().read();
    }

    public static char skipWhitespace(Context cx, Scriptable thisObj, Object[] args, Function funObj)
        throws IOException
    {
        char ch;

        while(true) {
            ch = peek(cx, thisObj, args, funObj);

            if (!Character.isWhitespace(ch))
                break;

            ch = (char)stdin().read();
        }

        return ch;
    }
        
    public static String readUntilWhitespace(Context cx, Scriptable thisObj, Object[] args, Function funObj)
        throws IOException
    {
        String str = "";

        while(!Character.isWhitespace(peek(cx, thisObj, args, funObj)))
            str += (char)stdin().read();

        return str;
    }
        


    private static String findMessageText(Context cx, Object[] args)
    {
        // REVISIT: Switch to StringBuilder, if this turns out to be a performance issue
        String msg = "";

        for (int i=0; i < args.length; i++) {
            if (i > 0)
                msg += " ";

            msg += Context.toString(args[i]);
        }

        return msg;
    }

    public static void logInfo(Context cx, Scriptable thisObj, Object[] args, Function funObj)
    {
        jsLog.info(findMessageText(cx, args));
    }

    public static void logWarn(Context cx, Scriptable thisObj, Object[] args, Function funObj)
    {
        jsLog.warn(findMessageText(cx, args));
    }

    public static void logError(Context cx, Scriptable thisObj, Object[] args, Function funObj)
    {
        jsLog.error(findMessageText(cx, args));
    }


    public static void print(Context cx, Scriptable thisObj, Object[] args, Function funObj)
    {
        System.out.print(findMessageText(cx, args));
    }

    public static void println(Context cx, Scriptable thisObj, Object[] args, Function funObj)
    {
        print(cx, thisObj, args, funObj);

        System.out.println();
    }

    public static String readln(Context cx, Scriptable thisObj, Object[] args, Function funObj)
        throws IOException
    {
        return stdin().readLine();
    }

    public static String readcu(Context cx, Scriptable thisObj, Object[] args, Function funObj)
        throws IOException
    {
        String source = stdin().readLine();

        if (source == null)
            return null;

        while(true) {
            if (cx.stringIsCompilableUnit(source))
                break;

            String newline = stdin().readLine();

            if (newline == null) 
                break;

            source = source + newline + "\n";
        }

        return source;
    }

    /**
     * Get and set the language version.
     *
     * This method is defined as a JavaScript function.
     */
    public static double version(Context cx, Scriptable thisObj, Object[] args, Function funObj)
    {
        return RHINOWIKI_VERSION;
    }

    /**
     * Load and execute a set of JavaScript source files.
     *
     * This method is defined as a JavaScript function.
     *
     */
    public static void load(Context cx, Scriptable thisObj, Object[] args, Function funObj)
    {
        Main main = (Main)getTopLevelScope(thisObj);

        for (int ii = 0; ii < args.length; ii++) {
            Object loadName = args[ii];

            log.info("Loading: " + loadName);

            main.loadJSResource(cx, Context.toString(loadName));
        }
    }

    public void run(Context cx)
    {
        Main scope = (Main)getTopLevelScope(this);

        try  {
            cx.evaluateString(scope, "run()", "<init>", -1, null);
        } catch (Exception ex) {
            log.error("Uncaught error during run(): " + ex.getMessage(), ex);
        }
    }

    public static void main(String[] args) throws IOException
    {
        log.info("start up.");

        Context cx = Context.enter();

        cx.setOptimizationLevel(-1);

        try {
            Main main = new Main();
            cx.initStandardObjects(main);
            
            String[] names = {
                "readfile", "readres", "print", "println",
                "skipWhitespace", "peek", "read", "readln",
                "readcu", "readUntilWhitespace", "version", "load",
                "logInfo", "logWarn", "logError"
            };

            main.defineFunctionProperties(names, Main.class, ScriptableObject.DONTENUM);


            main.loadJSResource(cx, "init.js");

            main.run(cx);

        } catch (Exception ex) {
            log.error("Uncaught Exception: " + ex.getMessage(), ex);
        } finally {
            Context.exit();
        }

        log.info("end run.");

        System.exit(0);
    }


}
