import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';

class AuthenticatedImageProvider extends ImageProvider<AuthenticatedImageProvider> {
  final String url;
  final String? token;
  final double scale;
  final Map<String, String>? headers;

  const AuthenticatedImageProvider({
    required this.url,
    this.token,
    this.scale = 1.0,
    this.headers,
  });

  @override
  Future<AuthenticatedImageProvider> obtainKey(ImageConfiguration configuration) {
    return SynchronousFuture<AuthenticatedImageProvider>(this);
  }

  @override
  ImageStreamCompleter loadImage(
    AuthenticatedImageProvider key,
    ImageDecoderCallback decode,
  ) {
    final StreamController<ImageChunkEvent> chunkEvents = StreamController<ImageChunkEvent>();
    return MultiFrameImageStreamCompleter(
      codec: _loadAsync(key, chunkEvents, decode),
      chunkEvents: chunkEvents.stream,
      scale: key.scale,
      debugLabel: key.url,
      informationCollector: () => <DiagnosticsNode>[
        DiagnosticsProperty<ImageProvider>('Image provider', this),
        DiagnosticsProperty<AuthenticatedImageProvider>('Image key', key),
      ],
    );
  }

  Future<ui.Codec> _loadAsync(
    AuthenticatedImageProvider key,
    StreamController<ImageChunkEvent> chunkEvents,
    ImageDecoderCallback decode,
  ) async {
    try {
      final Uri resolvedUri = Uri.parse(key.url);
      final HttpClient httpClient = HttpClient();
      final HttpClientRequest request = await httpClient.getUrl(resolvedUri);

      if (key.token != null && key.token!.isNotEmpty) {
        request.headers.set(HttpHeaders.authorizationHeader, 'Bearer ${key.token}');
      }
      if (key.headers != null) {
        key.headers!.forEach((k, v) {
          request.headers.set(k, v);
        });
      }

      final HttpClientResponse response = await request.close();
      if (response.statusCode != HttpStatus.ok) {
        throw NetworkImageLoadException(
          statusCode: response.statusCode,
          uri: resolvedUri,
        );
      }

      final Uint8List bytes = await consolidateHttpClientResponseBytes(
        response,
        onBytesReceived: (int cumulative, int? total) {
          chunkEvents.add(
            ImageChunkEvent(
              cumulativeBytesLoaded: cumulative,
              expectedTotalBytes: total,
            ),
          );
        },
      );

      if (bytes.lengthInBytes == 0) {
        throw Exception('Image from $resolvedUri was empty');
      }

      final ui.ImmutableBuffer buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
      return decode(buffer);
    } catch (e) {
      scheduleMicrotask(() {
        PaintingBinding.instance.imageCache.evict(key);
      });
      rethrow;
    } finally {
      chunkEvents.close();
    }
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other.runtimeType != runtimeType) return false;
    return other is AuthenticatedImageProvider &&
        other.url == url &&
        other.token == token &&
        other.scale == scale;
  }

  @override
  int get hashCode => Object.hash(url, token, scale);
}
