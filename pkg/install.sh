#!/bin/sh

RHINOWIKI_USERNAME=rhinowiki

# Must be root

if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

# create user and group

egrep "^${RHINOWIKI_USERNAME}" /etc/passwd >/dev/null

if [ $? -eq 0 ]; then
    echo "User exists: ${RHINOWIKI_USERNAME}"
else
    echo "Creating user: ${RHINOWIKI_USERNAME}"
    
    useradd --user-group --system ${RHINOWIKI_USERNAME}

    if [ $? -ne 0 ]; then
        echo "Could not create user: ${RHINOWIKI_USERNAME}"
        exit 1
    fi
fi

# Install jar in /usr/share

install -v --group=root --owner=root --directory /usr/share/rhinowiki
install -v --group=root --owner=root lib/uberjar/rhinowiki-standalone.jar /usr/share/rhinowiki

# create log directory

install -v --group=rhinowiki --owner=rhinowiki --directory /var/log/rhinowiki

# create data directory

install -v --group=rhinowiki --owner=rhinowiki --directory /var/lib/rhinowiki

# Configuration Files

install -v --group=root --owner=root --directory /etc/rhinowiki
install -v --group=root --owner=root logback.xml /etc/rhinowiki
install -v --group=root --owner=root config.edn /etc/rhinowiki

# rhinowiki service configuration

install -v --group=root --owner=root rhinowiki /etc/init.d

update-rc.d rhinowiki defaults

