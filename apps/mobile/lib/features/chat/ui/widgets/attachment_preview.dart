import 'package:flutter/material.dart';

import 'attachment_preview_bar.dart';

class AttachmentPreview extends StatelessWidget {
  final List<String> imagePaths;
  final ValueChanged<int> onRemove;

  const AttachmentPreview({
    super.key,
    required this.imagePaths,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return AttachmentPreviewBar.fromPaths(
      paths: imagePaths,
      onRemove: onRemove,
    );
  }
}
