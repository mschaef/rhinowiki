;; Copyright (c) 2015-2026 Michael Schaeffer (dba East Coast Toolworks)
;;
;; Licensed as below.
;;
;; Licensed under the Apache License, Version 2.0 (the "License");
;; you may not use this file except in compliance with the License.
;; You may obtain a copy of the License at
;;
;;       http://www.apache.org/licenses/LICENSE-2.0
;;
;; The license is also includes at the root of the project in the file
;; LICENSE.
;;
;; Unless required by applicable law or agreed to in writing, software
;; distributed under the License is distributed on an "AS IS" BASIS,
;; WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
;; See the License for the specific language governing permissions and
;; limitations under the License.
;;
;; You must not remove this notice, or any other, from this software.

(ns rhinowiki.store.watcher
  (:require [taoensso.timbre :as log])
  (:import [java.nio.file FileSystems StandardWatchEventKinds]))

(def ^:private watch-kinds
  (into-array [StandardWatchEventKinds/ENTRY_CREATE
               StandardWatchEventKinds/ENTRY_MODIFY
               StandardWatchEventKinds/ENTRY_DELETE]))

(defn- register-recursive [watcher root-file]
  (doseq [f (file-seq root-file)
          :when (.isDirectory f)]
    (log/debug "Watching directory:" (.getPath f))
    (-> (.toPath f)
        (.register watcher watch-kinds))))

(defn start-watcher
  "Watches article-root recursively for file changes. Calls callback
   whenever any file is created, modified, or deleted. Returns the
   WatchService (a Closeable) if the caller needs to shut it down."
  [article-root callback]
  (let [root-file (java.io.File. article-root)
        watcher (.newWatchService (FileSystems/getDefault))]
    (register-recursive watcher root-file)
    (doto (Thread.
           (bound-fn []
             (log/info "File watcher started for:" article-root)
             (loop []
               (let [watch-key (try
                                 (.take watcher)
                                 (catch java.nio.file.ClosedWatchServiceException _ nil)
                                 (catch InterruptedException _ nil))]
                 (when watch-key
                   (when (seq (.pollEvents watch-key))
                     (log/info "File change detected, invalidating cache")
                     (try
                       (callback)
                       (catch Exception e
                         (log/error e "Error in file-watcher callback"))))
                   (.reset watch-key)
                   (recur)))))
           "rhinowiki-file-watcher")
      (.setDaemon true)
      (.start))
    watcher))
