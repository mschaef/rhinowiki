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

(ns rhinowiki.site.error-handling
  (:use playbook.core
        compojure.core)
  (:require [taoensso.timbre :as log]
            [compojure.route :as route]
            [playbook.config :as config]
            [rhinowiki.site.toplevel-page :as page]))

(defn error-page [blog]
  (page/site-page blog "Unexpected Error"
                  [:div.page-message
                   [:h3 "Unexpected Error"]
                   [:p
                    "Please accept our apologies. There has been an unexpected error "
                    "while processing your request. Please return to the home page "
                    [:a {:href "/"} "here"] " and try again."]]))

(defn page-not-found [blog req]
  (log/info "Page not found:" (:uri req))
  (page/site-page blog "Page Not Found"
                  [:div.page-message
                   [:h3 "Page Not Found"]
                   [:p
                    "We can't find the page you're looking for. Please"
                    " return to the home page " [:a {:href "/"} "here"]
                    " and try again."]]))

(defn all-routes [blog-ref]
  (routes
   (GET "/error" {params :params}
     (error-page @blog-ref))

   (GET "/induce-error" []
     (when (config/cval :development-mode)
       (throw (Exception. "Induced Error"))))

   (route/not-found (partial page-not-found @blog-ref))))
