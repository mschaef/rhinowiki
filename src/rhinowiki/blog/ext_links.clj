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

(ns rhinowiki.blog.ext-links
  (:require [taoensso.timbre :as log]))

;;; External link registry
;;;
;;; Links written as [text](!ext:https://...) in article markdown are
;;; rewritten at render time to /go/<slug>, where the slug is the first
;;; 12 hex characters of the SHA-256 hash of the target URL. This keeps
;;; slugs stable across restarts while avoiding an open redirect.
;;;
;;; The registry is a global atom because slugs are derived solely from
;;; the target URL, so entries are naturally unique and site-agnostic.

(def ^:private registry (atom {}))

(defn url->slug
  "Returns a 12-character hex slug derived from the SHA-256 hash of url."
  [url]
  (let [digest (java.security.MessageDigest/getInstance "SHA-256")
        hash-bytes (.digest digest (.getBytes url "UTF-8"))]
    (apply str (take 12 (map #(format "%02x" %) hash-bytes)))))

(defn register-url!
  "Adds url to the registry and returns its slug."
  [url]
  (let [slug (url->slug url)]
    (swap! registry assoc slug url)
    slug))

(defn lookup-slug
  "Returns the URL for slug, or nil if not found."
  [slug]
  (get @registry slug))

(defn- scan-for-ext-urls
  "Returns all !ext: target URLs found in text."
  [text]
  (map #(nth % 2) (re-seq #"\[([^\]]*)\]\(!ext:(https?://[^\)]*)\)" text)))

(defn rebuild-registry!
  "Rebuilds the registry from a sequence of article text strings.
  Atomically replaces the old registry, so there is no window during
  which the registry is empty. Intended to be called on a background
  thread after blog load or invalidation."
  [article-texts]
  (log/info "Rebuilding external link registry...")
  (let [new-registry (into {}
                           (for [text article-texts
                                 :when text
                                 url (scan-for-ext-urls text)]
                             [(url->slug url) url]))]
    (reset! registry new-registry)
    (log/info "External link registry rebuilt:" (count new-registry) "entries")))
