// Demonstration upstream: JDK HTTP server, no Maven or external dependencies.
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class Demo {
    public static void main(String[] args) throws Exception {
        var server = HttpServer.create(new InetSocketAddress(8080), 0);
        server.createContext("/healthz", exchange -> {
            var body = "ok".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            try (var stream = exchange.getResponseBody()) { stream.write(body); }
        });
        server.createContext("/v3/api-docs", exchange -> {
            var body = """
                {"openapi":"3.0.3","info":{"title":"Java demonstration API","version":"1.0.0"},"paths":{"/hello":{"get":{"summary":"Example greeting (documentation only)","responses":{"200":{"description":"Greeting"}}}}}}
                """.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            try (var stream = exchange.getResponseBody()) { stream.write(body); }
        });
        server.createContext("/hello", exchange -> {
            var body = "Hello from Java demo".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            try (var stream = exchange.getResponseBody()) { stream.write(body); }
        });
        server.start();
    }
}
