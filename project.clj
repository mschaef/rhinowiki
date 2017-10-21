(defproject rhinowiki "0.1.0-SNAPSHOT"
  :description "Rhinowiki Blog Engine"
  :url "http://www.mschaef.com"
  
  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}

  :plugins [[lein-ring "0.9.7"]]
  
  :dependencies [[org.clojure/clojure "1.8.0"]
                 [org.clojure/tools.logging "0.3.1"]
                 [ch.qos.logback/logback-classic "1.1.7"]
                 [ring/ring-jetty-adapter "1.5.0"]
                 [slester/ring-browser-caching "0.1.1"]
                 [org.eclipse.jgit/org.eclipse.jgit "4.9.0.201710071750-r"]
                 [compojure "1.5.1"]
                 [hiccup "1.0.5"]
                 [markdown-clj "0.9.89"]
                 [org.eclipse.jgit/org.eclipse.jgit "4.4.1.201607150455-r"]]

  :ring { :handler rhinowiki.core/handler }
  
  :main ^:skip-aot rhinowiki.core
  :target-path "target/%s"
  :profiles {:uberjar {:aot :all}})
