package main

import (
	"fmt"
	"log"
	"net/http"
)

var i int

func hello(w http.ResponseWriter, r *http.Request) {
	i++
	println(i)
	w.Write([]byte(fmt.Sprintf("%d", i)))
}

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		hello(w, r)
	})
	log.Println("start http server :9998")
	log.Fatal(http.ListenAndServe(":9998", nil))
}
