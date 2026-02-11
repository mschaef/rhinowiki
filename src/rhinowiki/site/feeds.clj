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

(ns rhinowiki.site.feeds
  (:use compojure.core
        rhinowiki.utils)
  (:require [clojure.data.xml :as xml]
            [ring.util.response :as ring-response]
            [playbook.config :as config]
            [rhinowiki.blog.parser :as parser]
            [rhinowiki.blog.blog :as blog]))

(def df-atom-rfc3339 (java.text.SimpleDateFormat. "yyyy-MM-dd'T'HH:mm:ssXXX"))

(def xmlns-atom "http://www.w3.org/2005/Atom")

(defn- atom-article-entry [blog article]
  (xml/element "entry" {}
               (xml/element "title" {} (:title article))
               (xml/element "id" {} (str "urn:uuid:" (:id article)))
               (xml/element "updated" {} (.format df-atom-rfc3339 (:date article)))
               (xml/element "author" {} (xml/element "name" {} (:author blog)))
               (xml/element "link" {:href (:permalink article)})
               (xml/element "content" {:type "html"}
                            (xml/cdata (parser/article-content-html article)))))

(defn- atom-blog-feed [blog articles]
  (xml/indent-str
   (xml/element "feed" {:xmlns xmlns-atom}
                (xml/element "title" {} (:title blog))
                (xml/element "link" {:href (:base-url blog)})
                (xml/element "link" {:rel "self" :href (str (:base-url blog) "/feed/atom")})
                (xml/element "updated" {} (.format df-atom-rfc3339 (or (:date (first articles))
                                                                       (java.util.Date.))))
                (xml/element "id" {} (str "urn:uuid:" (:blog-id blog)))
                (map #(atom-article-entry blog %) articles))))

(def df-rss-rfc822 (java.text.SimpleDateFormat. "EEE, dd MMM yyyy HH:mm:ss Z"))

(defn- rss-blog-email [blog]
  (format "%s (%s)" (:email blog) (:author blog)))

(defn- rss-article-entry [blog article]
  (xml/element "item" {}
               (xml/element "title" {} (:title article))
               (xml/element "link" {} (:permalink article))
               (xml/element "author" {} (rss-blog-email blog))
               (xml/element "guid" {} (:permalink article))
               (xml/element "pubDate" {}  (.format df-rss-rfc822 (:date article)))
               (xml/element "description" {}
                            (xml/cdata (parser/article-content-html article)))))

(defn- rss-blog-feed [blog articles]
  (xml/indent-str
   (xml/element "rss" {:version "2.0"}
                (xml/element "channel" {}
                             (xml/element "title" {} (:title blog))
                             (xml/element "link" {} (:base-url blog))
                             (xml/element "link" {:xmlns xmlns-atom
                                                  :rel "self"
                                                  :href (str (:base-url blog) "/feed/rss")})
                             (xml/element "description" {} (:title blog))
                             (xml/element "managingEditor" {} (rss-blog-email blog))
                             (xml/element "webMaster" {} (rss-blog-email blog))
                             (xml/element "generator" {} (str "rhinowiki-" (get-version)))
                             (xml/element "language" {} (:language blog))
                             (xml/element "docs" {} (config/cval :rss-spec-location))
                             (xml/element "pubDate" {} (.format df-rss-rfc822 (or (:date (first articles))
                                                                                  (java.util.Date.))))
                             (map #(rss-article-entry blog %) articles)))))

;;;; RSS and Atom Feeds

(defn- blog-feed-articles [blog tag]
  (blog/blog-display-articles blog nil tag (:feed-post-limit blog)))

(defn- blog-rss-response [blog tag]
  (-> (rss-blog-feed blog (blog-feed-articles blog tag))
      (ring-response/response)
      (ring-response/header "Content-Type" "application/rss+xml")))

(defn- blog-atom-response [blog tag]
  (-> (atom-blog-feed blog (blog-feed-articles blog tag))
      (ring-response/response)
      (ring-response/header "Content-Type" "application/atom+xml")))

(defn feed-routes [blog-ref]
  (routes
   (GET "/feed/atom" [tag]
     (blog-atom-response @blog-ref tag))

   (GET "/feed/rss" [tag]
     (blog-rss-response @blog-ref tag))))
