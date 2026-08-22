import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const Color transparent = Color(0x00000000);
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);

  // Dark Theme tokens
  static const Color darkBackground = Color(0xFF121212);
  static const Color darkForeground = Color(0xFFE2E8F0);
  static const Color darkCard = Color(0xFF171717);
  static const Color darkCardForeground = Color(0xFFE2E8F0);
  static const Color darkPopover = Color(0xFF242424);
  static const Color darkPopoverForeground = Color(0xFFA9A9A9);
  static const Color darkPrimary = Color(0xFF72E3AD);
  static const Color darkPrimaryForeground = Color(0xFF1E2723);
  static const Color darkSecondary = Color(0xFF242424);
  static const Color darkSecondaryForeground = Color(0xFFFAFAFA);
  static const Color darkMuted = Color(0xFF1F1F1F);
  static const Color darkMutedForeground = Color(0xFFA2A2A2);
  static const Color darkAccent = Color(0xFF313131);
  static const Color darkAccentForeground = Color(0xFFFAFAFA);
  static const Color darkDestructive = Color(0xFF541C15);
  static const Color darkDestructiveForeground = Color(0xFFEDE9E8);
  static const Color darkBorder = Color(0xFF292929);
  static const Color darkInput = Color(0xFF242424);
  static const Color darkRing = Color(0xFF72E3AD);
  static const Color darkSidebar = Color(0xFF121212);
  static const Color darkSidebarForeground = Color(0xFF898989);
  static const Color darkSidebarPrimary = Color(0xFF72E3AD);
  static const Color darkSidebarPrimaryForeground = Color(0xFF1E2723);
  static const Color darkSidebarAccent = Color(0xFF313131);
  static const Color darkSidebarAccentForeground = Color(0xFFFAFAFA);
  static const Color darkSidebarBorder = Color(0xFF292929);
  static const Color darkSidebarRing = Color(0xFF72E3AD);

  static const Color darkSurface = Color(0xFF171717);
  static const Color darkSurfaceHover = Color(0xFF242424);
  static const Color darkBorderHover = Color(0xFF313131);

  // Light Theme tokens
  static const Color lightBackground = Color(0xFFFCFCFC);
  static const Color lightForeground = Color(0xFF171717);
  static const Color lightCard = Color(0xFFFCFCFC);
  static const Color lightCardForeground = Color(0xFF171717);
  static const Color lightPopover = Color(0xFFFCFCFC);
  static const Color lightPopoverForeground = Color(0xFF525252);
  static const Color lightPrimary = Color(0xFF72E3AD);
  static const Color lightPrimaryForeground = Color(0xFF1E2723);
  static const Color lightSecondary = Color(0xFFFDFDFD);
  static const Color lightSecondaryForeground = Color(0xFF171717);
  static const Color lightMuted = Color(0xFFEDEDED);
  static const Color lightMutedForeground = Color(0xFF202020);
  static const Color lightAccent = Color(0xFFEDEDED);
  static const Color lightAccentForeground = Color(0xFF202020);
  static const Color lightDestructive = Color(0xFFCA3214);
  static const Color lightDestructiveForeground = Color(0xFFFFFCFC);
  static const Color lightBorder = Color(0xFFDFDFDF);
  static const Color lightInput = Color(0xFFF6F6F6);
  static const Color lightRing = Color(0xFF72E3AD);
  static const Color lightSidebar = Color(0xFFFCFCFC);
  static const Color lightSidebarForeground = Color(0xFF707070);
  static const Color lightSidebarPrimary = Color(0xFF72E3AD);
  static const Color lightSidebarPrimaryForeground = Color(0xFF1E2723);
  static const Color lightSidebarAccent = Color(0xFFEDEDED);
  static const Color lightSidebarAccentForeground = Color(0xFF202020);
  static const Color lightSidebarBorder = Color(0xFFDFDFDF);
  static const Color lightSidebarRing = Color(0xFF72E3AD);

  static const Color lightSurface = Color(0xFFEDEDED);
  static const Color lightSurfaceHover = Color(0xFFDFDFDF);
  static const Color lightBorderHover = Color(0xFFCCCCCC);

  // Common / Direct brand tokens
  static const Color primary = Color(0xFF72E3AD);
  static const Color primaryForeground = Color(0xFF1E2723);
  static const Color secondary = Color(0xFF242424);
  static const Color secondaryForeground = Color(0xFFFAFAFA);
  static const Color muted = Color(0xFF1F1F1F);
  static const Color mutedForeground = Color(0xFFA2A2A2);
  static const Color accent = Color(0xFF313131);
  static const Color accentForeground = Color(0xFFFAFAFA);

  static const Color destructive = Color(0xFFCA3214);
  static const Color destructiveForeground = Color(0xFFFFFCFC);
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFCA3214);

  // Chart tokens
  static const Color chart1Light = Color(0xFF72E3AD);
  static const Color chart2Light = Color(0xFF3B82F6);
  static const Color chart3Light = Color(0xFF8B5CF6);
  static const Color chart4Light = Color(0xFFF59E0B);
  static const Color chart5Light = Color(0xFF10B981);

  static const Color chart1Dark = Color(0xFF4ADE80);
  static const Color chart2Dark = Color(0xFF60A5FA);
  static const Color chart3Dark = Color(0xFFA78BFA);
  static const Color chart4Dark = Color(0xFFFBBF24);
  static const Color chart5Dark = Color(0xFF2DD4BF);

  // Text hierarchy
  static const Color textPrimaryDark = Color(0xFFE2E8F0);
  static const Color textSecondaryDark = Color(0xFFA2A2A2);
  static const Color textTertiaryDark = Color(0xFF898989);

  static const Color textPrimaryLight = Color(0xFF171717);
  static const Color textSecondaryLight = Color(0xFF525252);
  static const Color textTertiaryLight = Color(0xFF707070);

  // File syntax colors
  static const Color fileJs = Color(0xFFF1E05A);
  static const Color fileTs = Color(0xFF3178C6);
  static const Color fileHtml = Color(0xFFE34C26);
  static const Color fileCss = Color(0xFF563D7C);
}

class AppSpacing {
  AppSpacing._();

  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 24.0;
  static const double xxl = 32.0;
  static const double xxxl = 48.0;

  static const double radiusSm = 4.0;
  static const double radiusMd = 6.0;
  static const double radiusLg = 8.0;
  static const double radiusXl = 12.0;
  static const double radiusFull = 9999.0;
}

class AppTypography {
  AppTypography._();

  static const String fontFamily = 'Outfit';

  static const TextStyle display = TextStyle(
    fontFamily: fontFamily,
    fontSize: 32.0,
    fontWeight: FontWeight.w700,
    height: 1.2,
    letterSpacing: -0.5,
  );

  static const TextStyle headlineLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 24.0,
    fontWeight: FontWeight.w700,
    height: 1.3,
    letterSpacing: -0.3,
  );

  static const TextStyle headlineMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 20.0,
    fontWeight: FontWeight.w600,
    height: 1.3,
  );

  static const TextStyle headlineSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 18.0,
    fontWeight: FontWeight.w600,
    height: 1.35,
  );

  static const TextStyle titleLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16.0,
    fontWeight: FontWeight.w600,
    height: 1.4,
  );

  static const TextStyle titleMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14.0,
    fontWeight: FontWeight.w600,
    height: 1.4,
  );

  static const TextStyle titleSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 13.0,
    fontWeight: FontWeight.w600,
    height: 1.4,
  );

  static const TextStyle bodyLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16.0,
    fontWeight: FontWeight.w400,
    height: 1.5,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14.0,
    fontWeight: FontWeight.w400,
    height: 1.5,
  );

  static const TextStyle bodySmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12.0,
    fontWeight: FontWeight.w400,
    height: 1.5,
  );

  static const TextStyle labelLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14.0,
    fontWeight: FontWeight.w500,
    height: 1.4,
  );

  static const TextStyle labelMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12.0,
    fontWeight: FontWeight.w500,
    height: 1.4,
  );

  static const TextStyle labelSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 11.0,
    fontWeight: FontWeight.w500,
    height: 1.4,
  );

  static const TextStyle code = TextStyle(
    fontFamily: 'monospace',
    fontSize: 13.0,
    fontWeight: FontWeight.w400,
    height: 1.45,
  );
}

class AppTheme {
  AppTheme._();

  static ThemeData dark() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      fontFamily: AppTypography.fontFamily,
      scaffoldBackgroundColor: AppColors.darkBackground,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.darkPrimary,
        onPrimary: AppColors.darkPrimaryForeground,
        secondary: AppColors.darkSecondary,
        onSecondary: AppColors.darkSecondaryForeground,
        surface: AppColors.darkSurface,
        onSurface: AppColors.darkForeground,
        error: AppColors.darkDestructive,
        onError: AppColors.darkDestructiveForeground,
      ),
      cardTheme: CardThemeData(
        color: AppColors.darkCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          side: const BorderSide(color: AppColors.darkBorder),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.darkBackground,
        foregroundColor: AppColors.darkForeground,
        elevation: 0,
        centerTitle: false,
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.darkBorder,
        thickness: 1,
        space: 1,
      ),
    );
  }

  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      fontFamily: AppTypography.fontFamily,
      scaffoldBackgroundColor: AppColors.lightBackground,
      colorScheme: const ColorScheme.light(
        primary: AppColors.lightPrimary,
        onPrimary: AppColors.lightPrimaryForeground,
        secondary: AppColors.lightSecondary,
        onSecondary: AppColors.lightSecondaryForeground,
        surface: AppColors.lightSurface,
        onSurface: AppColors.lightForeground,
        error: AppColors.lightDestructive,
        onError: AppColors.lightDestructiveForeground,
      ),
      cardTheme: CardThemeData(
        color: AppColors.lightCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          side: const BorderSide(color: AppColors.lightBorder),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.lightBackground,
        foregroundColor: AppColors.lightForeground,
        elevation: 0,
        centerTitle: false,
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.lightBorder,
        thickness: 1,
        space: 1,
      ),
    );
  }
}
