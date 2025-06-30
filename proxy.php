<?php
// proxy.php

// Load Composer's autoloader
require 'vendor/autoload.php';

use GuzzleHttp\Client;
use GuzzleHttp\RequestOptions;
use GuzzleHttp\Exception\RequestException;

// --- IMPORTANT CONFIGURATION ---
// Replace with your actual Lunos API Key
$lunosApiKey = 'YOUR_LUNOS_API_KEY'; // <<<--- !!! IMPORTANT: REPLACE THIS WITH YOUR ACTUAL API KEY !!!
// Replace with the Model ID you are using
$modelId = 'deepseek/deepseek-chat-v3-0324'; // Example model ID

// --- CORS SETTINGS ---
// Define allowed origins for CORS. Use a comma-separated string for multiple.
// For local development with Live Server, it's usually: http://127.0.0.1:5500 or http://localhost:5500
// In production, replace with your actual domain(s), e.g., 'https://yourdomain.com'
$allowedOrigins = ['http://127.0.0.1:5500', 'http://localhost:5500'];

// Get the origin of the current request
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Check if the request origin is in the allowed list
if (in_array($requestOrigin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $requestOrigin");
} else {
    // If origin is not allowed, block the request or set a default
    // For production, you might just exit here to block unknown origins
    // For development, you might choose to allow all (*) or set a default if origin is null
    // header("Access-Control-Allow-Origin: *"); // NOT recommended for production
}

header("Access-Control-Allow-Methods: POST, OPTIONS"); // Allow POST and OPTIONS (for preflight requests)
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Allow Content-Type and Authorization headers
header("Content-Type: application/json"); // The response will always be in JSON format

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Basic API Key validation (server-side)
if (empty($lunosApiKey) || $lunosApiKey === 'YOUR_LUNOS_API_KEY') {
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => ['message' => 'Lunos API Key is not configured on the server. Please update proxy.php.']]);
    exit();
}

// Only process if the request is POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get JSON data from the frontend request
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    // Validate that the 'messages' array exists and is not empty
    if (!isset($data['messages']) || !is_array($data['messages']) || empty($data['messages'])) {
        http_response_code(400); // Bad Request
        echo json_encode(['error' => ['message' => 'The "messages" field is required and must be a non-empty array.']]);
        exit();
    }

    // Basic validation for message structure to prevent sending malformed requests to API
    foreach ($data['messages'] as $message) {
        if (!isset($message['role']) || !isset($message['content']) ||
            !is_string($message['role']) || !is_string($message['content'])) {
            http_response_code(400); // Bad Request
            echo json_encode(['error' => ['message' => 'Each message must have "role" and "content" as strings.']]);
            exit();
        }
        // Further validate roles if needed, e.g., 'user', 'system', 'assistant'
        $allowedRoles = ['user', 'system', 'assistant'];
        if (!in_array($message['role'], $allowedRoles)) {
            http_response_code(400);
            echo json_encode(['error' => ['message' => 'Invalid role in messages. Allowed roles are: ' . implode(', ', $allowedRoles)]]);
            exit();
        }
    }

    try {
        $client = new Client([
            'base_uri' => 'https://api.lunos.tech/v1/',
            'timeout'  => 60.0, // Increased timeout for potentially longer AI responses
        ]);

        $response = $client->post('chat/completions', [
            RequestOptions::JSON => [
                'model' => $modelId,
                'messages' => $data['messages'], // Pass the entire message history
                'temperature' => 0.7, // Adjust creativity (0.0-1.0)
                'max_tokens' => 2000, // Limit the response length to prevent excessive billing/response size
                'stream' => false // Ensure streaming is off for a simple JSON response
            ],
            'headers' => [
                'Authorization' => 'Bearer ' . $lunosApiKey,
                'Content-Type' => 'application/json',
            ],
        ]);

        // Get the response body and send it back to the frontend
        echo $response->getBody();

    } catch (RequestException $e) {
        // Handle Guzzle HTTP request errors (e.g., 4xx or 5xx responses from Lunos API)
        $statusCode = 500; // Default to internal server error
        $errorMessage = 'An error occurred while communicating with the AI service.';
        $errorDetails = null;

        if ($e->hasResponse()) {
            $response = $e->getResponse();
            $statusCode = $response->getStatusCode();
            $responseBody = json_decode($response->getBody()->getContents(), true); // Get body and decode
            
            // Extract specific error message from Lunos API if available
            $errorMessage = $responseBody['error']['message'] ?? $response->getReasonPhrase() ?? $errorMessage;
            $errorDetails = $responseBody['error'] ?? null; // Keep full error object for logging/debugging
        } else {
             // Network error or other non-response errors
             $errorMessage = 'Network error or unable to connect to AI service: ' . $e->getMessage();
        }

        // Log the error for debugging purposes (adjust path as needed)
        error_log(sprintf(
            "Lunos API Error: Status %d - Message: %s - Details: %s - Request: %s",
            $statusCode,
            $errorMessage,
            json_encode($errorDetails),
            json_encode($data['messages'])
        ));

        http_response_code($statusCode);
        echo json_encode(['error' => ['message' => $errorMessage, 'code' => $statusCode]]);

    } catch (\Exception $e) {
        // Handle any other unexpected PHP errors
        http_response_code(500);
        $errorMessage = 'An internal server error occurred: ' . $e->getMessage();
        error_log("General PHP Error: " . $errorMessage);
        echo json_encode(['error' => ['message' => $errorMessage]]);
    }
} else {
    // If not a POST method, return an error
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => ['message' => 'Method Not Allowed']]);
}
?>