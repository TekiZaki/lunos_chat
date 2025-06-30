<?php
// proxy.php

// Load Composer's autoloader
require 'vendor/autoload.php';

use GuzzleHttp\Client;
use GuzzleHttp\RequestOptions;

// --- KONFIGURASI PENTING ---
// Ganti dengan API Key Lunos Anda yang sebenarnya
$lunosApiKey = 'API_KEY_ANDA'; // Ganti dengan API Key Lunos Anda
// Ganti dengan Model ID yang Anda gunakan
$modelId = 'deepseek/deepseek-chat-v3-0324';
// Endpoint Lunos API
$lunosApiUrl = 'https://api.lunos.tech/v1/chat/completions';

// --- PENGATURAN CORS ---
// Izinkan origin dari mana request akan datang.
// Untuk pengembangan lokal dengan Live Server, biasanya:
// http://127.0.0.1:5500 atau http://localhost:5500
$allowedOrigin = 'http://127.0.0.1:5500'; // Ganti jika Live Server Anda menggunakan port lain

header("Access-Control-Allow-Origin: $allowedOrigin");
header("Access-Control-Allow-Methods: POST, OPTIONS"); // Izinkan metode POST dan OPTIONS (untuk preflight request)
header("Access-Control-Allow-Headers: Content-Type"); // Izinkan header Content-Type
header("Content-Type: application/json"); // Respons akan selalu dalam format JSON

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Hanya proses jika request adalah POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Ambil data JSON dari request frontend
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    // Pastikan pesan pengguna ada
    $userMessage = $data['message'] ?? 'Hello, how are you?'; // Default message jika tidak ada

    try {
        $client = new Client([
            'base_uri' => 'https://api.lunos.tech/v1/',
            'timeout'  => 1500.0, // Timeout dalam detik
        ]);

        $response = $client->post('chat/completions', [
            RequestOptions::JSON => [
                'model' => $modelId,
                'messages' => [
                    ['role' => 'system', 'content' => 'You are a helpful and friendly assistant named Lunos. Provide concise and helpful answers.'],
                    ['role' => 'user', 'content' => $userMessage]
                ],
                'temperature' => 0.7
            ],
            // Autentikasi di sini, bukan di client global headers
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
    // Jika bukan metode POST, kembalikan error
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Method Not Allowed']);
}
?>