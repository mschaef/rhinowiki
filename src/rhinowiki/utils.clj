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

(ns rhinowiki.utils)

(defmacro get-version []
  ;; Capture compile-time property definition from Lein
  (System/getProperty "rhinowiki.version"))

(defn resource-path [path]
  (str "/" (get-version) "/" path))

(defn thread-safe-date-format
  "Returns a thread-safe date formatter backed by a ThreadLocal<SimpleDateFormat>.
   java.text.SimpleDateFormat is not thread-safe, so bare defs shared across
   request threads can corrupt each other's parse/format state under load.

   Returns a map with two functions:
     :format - (fn [java.util.Date]) => String
     :parse  - (fn [String]) => java.util.Date"
  [pattern]
  (let [tl (proxy [ThreadLocal] []
             (initialValue [] (java.text.SimpleDateFormat. pattern)))]
    {:format (fn [date]  (.format ^java.text.SimpleDateFormat (.get tl) date))
     :parse  (fn [text]  (.parse  ^java.text.SimpleDateFormat (.get tl) text))}))

(defn format-date
  "Formats a java.util.Date using a formatter returned by thread-safe-date-format."
  [fmt date]
  ((:format fmt) date))

(defn parse-date
  "Parses a date string using a formatter returned by thread-safe-date-format.
   Returns nil on parse failure."
  [fmt text]
  (try
    ((:parse fmt) text)
    (catch Exception _ nil)))
