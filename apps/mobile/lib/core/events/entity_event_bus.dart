import 'dart:async';

class EntityUpdatedEvent {
  final String? type;
  final String? id;
  final String? action;
  final String? rawName;

  const EntityUpdatedEvent({
    this.type,
    this.id,
    this.action,
    this.rawName,
  });

  @override
  String toString() =>
      'EntityUpdatedEvent(type: $type, id: $id, action: $action, rawName: $rawName)';
}

class EntityEventBus {
  EntityEventBus._();

  static final EntityEventBus _instance = EntityEventBus._();
  static EntityEventBus get instance => _instance;

  final StreamController<EntityUpdatedEvent> _controller =
      StreamController<EntityUpdatedEvent>.broadcast();

  static Stream<EntityUpdatedEvent> get stream => _instance._controller.stream;

  static void emit(dynamic event) {
    if (event is EntityUpdatedEvent) {
      _instance._controller.add(event);
    } else if (event is String) {
      _instance._controller.add(
        EntityUpdatedEvent(rawName: event, type: event),
      );
    }
  }

  static StreamSubscription<EntityUpdatedEvent> listen(
    void Function(EntityUpdatedEvent event) onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) {
    return _instance._controller.stream.listen(
      onData,
      onError: onError,
      onDone: onDone,
      cancelOnError: cancelOnError,
    );
  }

  void dispose() {
    _controller.close();
  }
}
