<?php
// proxy.php

// Load Composer's autoloader
require 'vendor/autoload.php';

use GuzzleHttp\Client;
use GuzzleHttp\RequestOptions;

// --- KONFIGURASI PENTING ---
// Ganti dengan API Key Lunos Anda yang sebenarnya
$lunosApiKey = 'YOUR_API_KEY';
// Endpoint Lunos API
$lunosApiUrl = 'https://api.lunos.tech/v1/chat/completions';
// Path to your models list JSON file
$modelsListPath = __DIR__ . '/models.json';

// --- PENGATURAN CORS ---
// Izinkan origin dari mana request akan datang.
// Untuk pengembangan lokal dengan Live Server, biasanya:
// http://127.0.0.1:5500 atau http://localhost:5500
$allowedOrigin = 'http://127.0.0.1:5500'; // Ganti jika Live Server Anda menggunakan port lain

header("Access-Control-Allow-Origin: $allowedOrigin");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Izinkan GET (for models.json), POST, dan OPTIONS
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Handle requests ---

// Handle GET request for models.json
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($modelsListPath)) {
        echo file_get_contents($modelsListPath);
        exit();
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'models.json not found']);
        exit();
    }
}

// Only process if request is POST (for chat completions)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Ambil data JSON dari request frontend
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    // Pastikan pesan pengguna dan model ID ada
    $userMessage = $data['message'] ?? 'Hello, how are you?';
    // Get model ID from the request, default to a sensible one if not provided
    $modelId = $data['modelId'] ?? 'deepseek/deepseek-chat-v3-0324';

    try {
        $client = new Client([
            'base_uri' => 'https://api.lunos.tech/v1/',
            'timeout'  => 30.0, // Timeout dalam detik
        ]);

        $response = $client->post('chat/completions', [
            RequestOptions::JSON => [
                'model' => $modelId, // Use the dynamic model ID
                'messages' => [
                    ['role' => 'system', 'content' => 'You are a helpful and friendly assistant named Lunos. Provide concise and helpful answers.'],
                    ['role' => 'user', 'content' => $userMessage]
                ],
                'temperature' => 0.7
            ],
            'headers' => [
                'Authorization' => 'Bearer ' . $lunosApiKey,
                'Content-Type' => 'application/json',
            ],
        ]);

        // Ambil body response dan decode menjadi array asosiatif
        $responseBody = json_decode($response->getBody(), true);

        // Kirim response dari Lunos API kembali ke frontend
        echo json_encode($responseBody);

    } catch (\GuzzleHttp\Exception\ClientException $e) {
        // Tangani error HTTP client (misal 4xx error)
        $responseBody = json_decode($e->getResponse()->getBody(), true);
        http_response_code($e->getResponse()->getStatusCode()); // Set HTTP status code
        echo json_encode(['error' => $responseBody['error'] ?? 'Client error occurred']);
    } catch (\GuzzleHttp\Exception\ServerException $e) {
        // Tangani error HTTP server (misal 5xx error)
        $responseBody = json_decode($e->getResponse()->getBody(), true);
        http_response_code($e->getResponse()->getStatusCode());
        echo json_encode(['error' => $responseBody['error'] ?? 'Server error occurred']);
    } catch (\Exception $e) {
        // Tangani error umum lainnya
        http_response_code(500);
        echo json_encode(['error' => 'An unexpected error occurred: ' . $e->getMessage()]);
    }
} else {
    // If not GET or POST, return error
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Method Not Allowed']);
}
?>