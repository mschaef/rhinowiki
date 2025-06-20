;; Copyright (c) 2015-2025 Michael Schaeffer (dba East Coast Toolworks)
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

(ns rhinowiki.file
  (:use playbook.core)
  (:require [taoensso.timbre :as log]
            [clj-uuid :as uuid]))

(def file-hash-namespace #uuid "dc8f0822-f57d-48d6-a281-448c5b97a84b")

(defn- load-raw-data-file [article-root data-file]
  (log/debug "Loading file:" data-file)
  (let [content-raw (binary-slurp data-file)]
    {:file-name (.substring (.getCanonicalPath data-file)
                            (+ 1 (.length (.getCanonicalPath article-root))))
     :content-raw content-raw
     :id (uuid/v5 file-hash-namespace content-raw)
     :file-date (java.util.Date. (.lastModified data-file))}))

(defn- files-at-root [article-root exclude-prefix]
  (filter #(and
            (.isFile %)
            (not (and exclude-prefix
                      (.startsWith (.getPath %) exclude-prefix))))
          (file-seq article-root)))

(defn load-data-files [& {:keys [article-root exclude-prefix]
                          :or {article-root ""}}]
  (let [article-root (java.io.File. article-root)]
    (log/info "Loading data files:" (.getCanonicalPath article-root))
    (map (partial load-raw-data-file article-root)
         (files-at-root article-root exclude-prefix))))
