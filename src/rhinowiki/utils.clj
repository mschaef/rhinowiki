(ns rhinowiki.utils)

(defmacro get-version []
  ;; Capture compile-time property definition from Lein
  (System/getProperty "rhinowiki.version"))

(defmacro unless [ condition & body ]
  `(when (not ~condition)
     ~@body))

(defn parsable-integer? [ str ]
  (try
   (Integer/parseInt (.trim str))
   (catch Exception ex
     false)))

(def truthy-strings #{"yes" "true" "1" "y" "t" "on"})

(defn parse-boolean-string
  ([ str ]
   (parse-boolean-string str nil))
  ([ str default ]
   (if (string? str)
     (boolean
      (truthy-strings (.trim str)))
     default)))

(defn vmap [f coll]
  (into {} (for [[k v] coll] [k (f v)])))

(defn to-map [ key-fn values ]
  (into {} (map (fn [ value ]
                  [(key-fn value) value])
                values )))

(defn to-map-with-keys [ keys-fn values ]
  (into {} (mapcat (fn [ value ]
                     (map (fn [ key ]
                            [key value])
                          (keys-fn value)))
                   values)))

(defn config-property
  ( [ name ] (config-property name nil))
  ( [ name default ]
      (let [prop-binding (System/getProperty name)]
        (if (nil? prop-binding)
          default
          (if-let [ int (parsable-integer? prop-binding) ]
            int
            prop-binding)))))

(defn add-shutdown-hook [ shutdown-fn ]
  (.addShutdownHook (Runtime/getRuntime)
                    (Thread. (fn []
                               (shutdown-fn)))))

(defn binary-slurp
  [^java.io.File file]
  (let [result (byte-array (.length file))]
    (with-open [in (java.io.DataInputStream. (clojure.java.io/input-stream file))]
      (.readFully in result))
    result))
