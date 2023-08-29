(defproject rhinowiki "0.3.14-SNAPSHOT"
  :description "Rhinowiki Blog Engine"
  :url "http://mschaef.com"

  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}

  :plugins [[lein-ring "0.9.7"]
            [lein-tar "3.3.0"]]

  :dependencies [[org.clojure/clojure "1.11.1"]
                 [ring/ring-jetty-adapter "1.10.0"]
                 [ring/ring-devel "1.10.0"]
                 [slester/ring-browser-caching "0.1.1"]
                 [org.eclipse.jgit/org.eclipse.jgit "4.9.0.201710071750-r"]
                 [org.clojure/data.xml "0.0.8"]
                 [danlentz/clj-uuid "0.1.9"]
                 [compojure "1.7.0"]
                 [hiccup "1.0.5"]
                 [markdown-clj "1.11.4"]
                 [cprop "0.1.19"]
                 [org.eclipse.jgit/org.eclipse.jgit "4.4.1.201607150455-r"]
                 [co.deps/ring-etag-middleware "0.2.1"]
                 [com.mschaef/playbook "0.0.11"]]

  :tar {:uberjar true
        :format :tar-gz
        :output-dir "."
        :leading-path "rhinowiki-install"}

  :main ^:skip-aot rhinowiki.main
  :target-path "target/%s"
  :profiles {:uberjar {:aot :all}}

  :jvm-opts ["-Dconf=local-config.edn"]

  :jar-name "rhinowiki.jar"
  :uberjar-name "rhinowiki-standalone.jar"

  :release-tasks [["vcs" "assert-committed"]
                  ["change" "version" "leiningen.release/bump-version" "release"]
                  ["vcs" "commit"]
                  ["vcs" "tag" "--no-sign" ]
                  ["tar"]
                  ["change" "version" "leiningen.release/bump-version"]
                  ["vcs" "commit"]
                  ["vcs" "push"]])
