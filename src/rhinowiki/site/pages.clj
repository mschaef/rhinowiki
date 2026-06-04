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

(ns rhinowiki.site.pages
  (:use compojure.core
        playbook.core
        rhinowiki.utils)
  (:require [taoensso.timbre :as log]
            [hiccup.page :as hiccup-page]
            [hiccup.util :as hiccup-util]
            [ring.util.response :as ring-response]
            [playbook.config :as config]
            [rhinowiki.blog.parser :as parser]
            [rhinowiki.blog.blog :as blog]
            [rhinowiki.blog.ext-links :as ext-links]
            [rhinowiki.site.feeds :as feeds]
            [rhinowiki.site.toplevel-page :as page]
            [rhinowiki.site.error-handling :as error-handling]
            [rhinowiki.utils :as utils]))

;;;; Web Site

(defn- url-query [path params]
  (str path (if (> (count params) 0)
              (str "?" (clojure.string/join "&" (map (fn [[k v]] (str (name k) "=" v)) params)))
              "")))

(defn- article-sponsor [blog article]
  (get-in blog [:sponsors (:sponsor article)]))

(defn- article-sponsor-block [blog article]
  (when-let [sponsor (article-sponsor blog article)]
    [:div.sponsor
     "Written with sponsorship by " [:a {:href (:link sponsor) :target "_blank" :rel "noopener noreferrer"} (:long-name sponsor) "."]]))

(defn- article-tags [blog article]
  (when (and (not (:page article))
             (> (count (:tags article)) 0))
    [:div.tags
     "Tags:"
     (map (fn [tag]
            [:span.tag
             [:a {:href (url-query "/blog" {:tag tag})} tag]])
          (sort (:tags article)))]))

(defmacro content-when [condition & body]
  `(when ~condition
     (list ~@body)))

(defn- article-block [blog article summarize?]
  (let [short-html (and summarize?
                        (parser/article-short-html article))]
    [:div.article
     (content-when (not (:page article))
                   [:div.date
                    (utils/format-date (:article-header (:date-format blog)) (:date article))]
                   [:h2.title
                    [:a {:href (:permalink article)}
                     (:title article)]])
     [:div.article-content
      (article-sponsor-block blog article)
      (or short-html
          (parser/article-content-html article))
      (when short-html
        [:div.read-more
         [:a.feed-navigation {:href (:permalink article)}
          "Read More..."]])
      (article-tags blog article)]]))

(defn- article-page [blog article-name]
  (when-let [article-info (blog/article-by-name blog article-name)]
    (page/site-page blog
                    article-info
                    [:div (article-block blog article-info false)])))

(defn- tag-query-block [tag]
  (when tag
    [:div.query
     "Articles with tag: "
     [:span.tag (hiccup-util/escape-html tag)]]))

(defn- articles-page [blog start tag]
  (let [display-articles (blog/blog-display-articles blog start tag (:recent-post-limit blog))]
    (page/site-page blog
                    {}
                    [:div.articles
                     (tag-query-block tag)
                     (map #(article-block blog % true) display-articles)
                     [:div.feed-navigation
                      (unless (< (count display-articles) (:recent-post-limit blog))
                              [:a {:href (url-query "/blog" (cond-> {:start (+ start (:recent-post-limit blog))}
                                                              tag (assoc :tag tag)))}
                               "Older Articles..."])]])))

(defn- contents-block [blog article]
  [:div
   [:a
    {:href (:permalink article)}
    (:title article)]])

(defn- group-by-date-header [blog articles]
  (partition-by :date-header
                (map #(assoc % :date-header (utils/format-date (:contents-header (:date-format blog)) (:date %)))
                     articles)))

(defn- contents-page-article-entry [blog article]
  [:div.entry
   [:a {:href (:permalink article)}
    (:title article)]
   (when-let [sponsor (article-sponsor blog article)]
     [:span.sponsor
      "sponsor: " [:a {:href (:link sponsor) :target "_blank" :rel "noopener noreferrer"} (:short-name sponsor)]])])

(defn- contents-page [blog start tag]
  (let [display-articles (blog/blog-display-articles blog start tag (:contents-post-limit blog))
        display-article-blocks (group-by-date-header blog display-articles)]
    (page/site-page blog
                    {:title "Table of Contents"}
                    [:div.contents
                     (tag-query-block tag)
                     [:div.subtitle "Table of Contents"]
                     [:div.blocks
                      (map (fn [block]
                             [:div.block
                              [:div.contents-header
                               (:date-header (first block))]
                              [:div.articles
                               (map #(contents-page-article-entry blog %) block)]])
                           display-article-blocks)]
                     [:div.feed-navigation
                      (unless (< (count display-articles) (:contents-post-limit blog))
                              [:a {:href (url-query "/contents" (cond-> {:start (+ start (:contents-post-limit blog))}
                                                                  tag (assoc :tag tag)))}
                               "Older Articles..."])]])))

(defn- maybe-redirect-response [blog path]
  (when-let [target (or (get-in blog [:redirects path])
                        (blog/article-redirect-by-name blog path))]
    (log/debug "Blog redirect from" path "to" target)
    (ring-response/redirect target :moved-permanently)))

(defn- file-response [blog file-name]
  (when-let [file-info (blog/file-by-name blog file-name)]
    (java.io.ByteArrayInputStream. (:content-raw file-info))))

;;;; Blog Routing

(defn blog-routes []
  (routes
   (GET "/" {blog :rhinowiki/blog {start :start tag :tag} :params}
     (or
      (article-page blog "index")
      (articles-page blog (or (try-parse-integer start) 0) tag)))

   (GET "/blog" {blog :rhinowiki/blog {start :start tag :tag} :params}
     (articles-page blog (or (try-parse-integer start) 0) tag))

   (GET "/contents" {blog :rhinowiki/blog {start :start tag :tag} :params}
     (contents-page blog (or (try-parse-integer start) 0) tag))

   (feeds/feed-routes)

   (GET "/go/:slug" [slug]
     (if-let [url (ext-links/lookup-slug slug)]
       (do
         (log/debug "External link redirect" slug "->" url)
         (ring-response/redirect url))
       {:status 404 :body "Not Found"}))

   (GET "/dev/poll" {generation :rhinowiki/generation}
     (when (config/cval :development-mode)
       {:status 200
        :headers {"Cache-Control" "no-store"}
        :body {:generation (if generation @generation 0)}}))

   (POST "/invalidate" {invalidate-fn :rhinowiki/invalidate-fn :as req}
     (let [provided-token (get-in req [:headers "x-invalidate-token"])
           expected-token (config/cval :invalidate-token)]
       (if (or (config/cval :development-mode)
               (and expected-token (= provided-token expected-token)))
         (do (invalidate-fn) "invalidated")
         {:status 403 :body "Forbidden"})))

   (GET "/*" {blog :rhinowiki/blog params :params}
     (maybe-redirect-response blog (:* params)))

   (GET "/*" {blog :rhinowiki/blog params :params}
     (article-page blog (:* params)))

   (GET "/*" {blog :rhinowiki/blog params :params}
     (file-response blog (:* params)))

   (error-handling/all-routes)))
