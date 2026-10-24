// Demonstration upstream: no dependency beyond Go's standard library.
package main

import (
    "net/http"
)

func main() {
    http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("ok")) })
    http.HandleFunc("/swagger/doc.json", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        w.Write([]byte(`{"swagger":"2.0","info":{"title":"Go demonstration API","version":"1.0.0"},"basePath":"/","paths":{"/hello":{"get":{"summary":"Example greeting (documentation only)","responses":{"200":{"description":"Greeting"}}}}}}`))
    })
    http.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("Hello from Go demo")) })
    if err := http.ListenAndServe(":8080", nil); err != nil { panic(err) }
}
