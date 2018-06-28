#!/bin/sh

POM_PROPERTIES_FILE=./target/uberjar/classes/META-INF/maven/rhinowiki/rhinowiki/pom.properties

lein clean && lein uberjar

if [ $? -ne 0 ]
then
    echo "Build failed."
    exit 1
fi

if [ ! -r $POM_PROPERTIES_FILE ]
then
    echo "Cannot find POM properties file."
    exit 1
fi

cp target/uberjar/rhinowiki-standalone.jar rhinowiki-install

PROJECT_VERSION=`grep version ${POM_PROPERTIES_FILE} | cut -d= -f2`

tar czvf rhinowiki-install-${PROJECT_VERSION}.tgz --exclude="*~" rhinowiki-install 
