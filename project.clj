(defproject rhinowiki "0.1.1-SNAPSHOT"
  :description "Rhinowiki Blog Engine"
  :url "http://www.mschaef.com"
  
  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}

  :plugins [[lein-ring "0.9.7"]]
  
  :dependencies [[org.clojure/clojure "1.9.0"]
                 [org.clojure/tools.logging "0.4.0"]
                 [ch.qos.logback/logback-classic "1.2.3"]
                 [ring/ring-jetty-adapter "1.6.3"]
                 [slester/ring-browser-caching "0.1.1"]
                 [org.eclipse.jgit/org.eclipse.jgit "4.9.0.201710071750-r"]
                 [org.clojure/data.xml "0.0.8"]
                 [danlentz/clj-uuid "0.1.7"]
                 [compojure "1.6.0"]
                 [hiccup "1.0.5"]
                 [markdown-clj "1.0.2"]
                 [cprop "0.1.11"]
                 [org.eclipse.jgit/org.eclipse.jgit "4.4.1.201607150455-r"]]

  :ring { :handler rhinowiki.core/handler }
  
  :main ^:skip-aot rhinowiki.core
  :target-path "target/%s"
  :profiles {:uberjar {:aot :all}}

  :jvm-opts ["-Dconf=local-config.edn"]

  :jar-name "rhinowiki.jar"
  :uberjar-name "rhinowiki-standalone.jar")
