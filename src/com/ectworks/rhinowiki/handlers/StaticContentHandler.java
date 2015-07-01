package com.ectworks.rhinowiki.handlers;

import java.io.IOException;
import java.io.FileNotFoundException;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.BufferedReader;
import java.io.File;

import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.HashMap;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpHandler;

import org.apache.log4j.Logger;

public class StaticContentHandler extends AbstractHandler
{
    static Logger log = Logger.getLogger(StaticContentHandler.class.getName());

    public String _fileRootPath;

    public HashMap<String, String> _mimeTypeMap = new HashMap<String, String>();

    public StaticContentHandler(String fileRootPath)
    {
        warnIfNotDirectory(fileRootPath);

        _fileRootPath = fileRootPath;
    }

    public void setMimeType(String fExt, String mimeType)
    {
        log.debug("Setting mime type of " + fExt + " to " + mimeType);

        if (_mimeTypeMap.containsKey(fExt))
            log.warn("Overridding mime type of " + fExt + " from " + _mimeTypeMap.get(fExt) + " to " + mimeType);

        _mimeTypeMap.put(fExt, mimeType);
    }

    protected void warnIfNotDirectory(String path)
    {
        File f = new File(path);

        if (!f.exists()) {
            log.warn("The specified file root path does not exist: " + path);
            return;
        }

        if (!f.isDirectory())
            log.warn("The specified file root path is not a directory: " + path);
    }

    public byte[] getFileBytes(File inFile)
        throws IOException, FileNotFoundException
    {
        byte[] inBytes = new byte[(int)inFile.length()];

        FileInputStream  is = null;
        try {
            is = new FileInputStream(inFile);

            int bytesRead = is.read(inBytes);

            if (bytesRead != inBytes.length)
                log.warn("Unexpected number of bytes (" + bytesRead + ") read from " + inFile.getName() + ". Expected " + inBytes.length + ".");
        } finally {      
            if (is != null)
                is.close();
        }

        return inBytes;
    }

    public File acceptInputFile(String filePath, StandardExchange exchange)
        throws Exception
    {
        File contentFile = new File(filePath);

        if (!contentFile.exists()) {
            log.warn("File not found: " + filePath);
            exchange.respondNotFound();
            return null;
        }

        if (contentFile.isDirectory()) {
            log.warn("Requested file is directory: " + filePath);
            exchange.respondNotFound();
            return null;
        }

        if (!contentFile.canRead()) {
            log.warn("Insufficient rights to read: " + filePath);
            exchange.respondNotFound(); // TODO: Change to access denied.
            return null;
        }

        return contentFile;
    }

    public String fileExtension(String filePath)
    {
        int lastSlashPos = filePath.lastIndexOf(File.separatorChar);

        if (lastSlashPos != -1)
            filePath = filePath.substring(lastSlashPos + 1);
            
        int dotPos = filePath.indexOf('.'); // REVISIT: Is there a Java standard way of finding the file extension separator?

        if (dotPos == -1)
            return "";

        return filePath.substring(dotPos + 1);
    }

    public String findMimeType(String filePath)
    {


        return "text/plain";
    }

    public void doHandle(StandardExchange exchange)
        throws Exception
    {
        String filePath = _fileRootPath + File.separatorChar + exchange.getPath();

        log.info("Incoming HTTP Request: " + exchange + " maps to file: " + filePath);

        File contentFile = acceptInputFile(filePath, exchange);

        if (contentFile == null)
            return;

        exchange.respondContent(findMimeType(filePath), getFileBytes(contentFile));
    }
}
