package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"github.com/rs/cors"
	"log"
)

type URL struct {

    LongURL string `json:"long_url"`
    ShortURL string `json:"short_url"`

}

// Dummy Database
var (

    database = make(map[string]string)
    mu sync.Mutex

)

// Base url of website
const baseURL = "https://shortify-backend-gamma.vercel.app/"

// Shorten link handler
func shortenURLHandler(w http.ResponseWriter, r *http.Request){

	enableCors(&w)

    // Only accept POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method. Use POST.", http.StatusMethodNotAllowed)
		return
	}

    // Parse the incoming JSON
	var request URL
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil || request.LongURL == "" || request.ShortURL == "" {
		http.Error(w, "Invalid JSON payload or missing 'long_url' or missing 'short_url'", http.StatusBadRequest)
		return
	}

	// Check if the short ID already exists in the database
	mu.Lock()
	_, exists := database[request.ShortURL]
	if exists {
		mu.Unlock() // Unlock before returning
		http.Error(w, "Short URL already exists", http.StatusConflict)
		return
	}

	// Add the new short URL to the database
	database[request.ShortURL] = request.LongURL
	mu.Unlock()

	// Return the full short URL
	shortURL := baseURL + request.ShortURL
	response := URL{
		LongURL:  request.LongURL,
		ShortURL: shortURL,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

}

// Redirect handler
func redirectHandler(w http.ResponseWriter, r *http.Request) {

	// Extract the shortlink ID from the URL path
	shortURL := r.URL.Path[len("/"):]

    // Log to debug if necessary
	fmt.Println("Received short URL:", shortURL)

	// Check if the shortlink exists in the database
	mu.Lock()
	longURL, exists := database[shortURL]
	mu.Unlock()

	if !exists {
		// If not found, return a 404 error
		http.Error(w, "Shortlink not found", http.StatusNotFound)
		return
	}

	// Redirect to the original URL
	http.Redirect(w, r, longURL, http.StatusFound)
}

func helloHandler(w http.ResponseWriter, r *http.Request) {

	w.Write([]byte("Helloworld"))
	
}

func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	}

func main() {
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"}, // Allow your frontend URL
		AllowedMethods:     []string{"GET", "POST"},       // Allow GET, POST, OPTIONS methods
		AllowCredentials: true,  // Allow cookies or credentials
		Debug:             true,  // Enable Debugging (useful for testing)
		AllowedHeaders:    []string{"Content-Type"},  // Allow Content-Type header

	})

	mux := http.NewServeMux()
	mux.HandleFunc("/", redirectHandler)
	mux.HandleFunc("/add", shortenURLHandler)
	mux.HandleFunc("/hello", helloHandler)

	// Apply the custom CORS handler to the mux
	handler := c.Handler(mux)

	// Start the server
	log.Fatal(http.ListenAndServe(":8080", handler)) // Change this to your desired port if needed
}

