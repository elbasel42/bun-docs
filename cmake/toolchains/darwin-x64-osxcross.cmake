set(CMAKE_SYSTEM_NAME Darwin)
set(CMAKE_SYSTEM_PROCESSOR x64)
set(CMAKE_OSX_ARCHITECTURES x86_64)

set(CMAKE_C_COMPILER_WORKS ON)
set(CMAKE_CXX_COMPILER_WORKS ON)

set(OSXCROSS_TARGET_DIR "/opt/osxcross")
set(OSXCROSS_SDK "${OSXCROSS_TARGET_DIR}/SDK/MacOSX14.5.sdk")
set(OSXCROSS_HOST "x86_64-apple-darwin23.5")

set(CMAKE_C_COMPILER "${OSXCROSS_TARGET_DIR}/bin/${OSXCROSS_HOST}-clang" CACHE FILEPATH "clang")
set(CMAKE_CXX_COMPILER "${OSXCROSS_TARGET_DIR}/bin/${OSXCROSS_HOST}-clang++" CACHE FILEPATH "clang++")
set(CMAKE_LINKER "${OSXCROSS_TARGET_DIR}/bin/${OSXCROSS_HOST}-ld" CACHE FILEPATH "ld")
set(CMAKE_AR "${OSXCROSS_TARGET_DIR}/bin/${OSXCROSS_HOST}-ar" CACHE FILEPATH "ar")
set(CMAKE_STRIP "${OSXCROSS_TARGET_DIR}/bin/${OSXCROSS_HOST}-strip" CACHE FILEPATH "strip")
set(CMAKE_RANLIB "${OSXCROSS_TARGET_DIR}/bin/${OSXCROSS_HOST}-ranlib" CACHE FILEPATH "ranlib")
set(CMAKE_NM "${OSXCROSS_TARGET_DIR}/bin/${OSXCROSS_HOST}-nm" CACHE FILEPATH "nm")
set(CMAKE_DSYMUTIL "${OSXCROSS_TARGET_DIR}/bin/${OSXCROSS_HOST}-dsymutil" CACHE FILEPATH "dsymutil")
set(CMAKE_INSTALL_NAME_TOOL "${OSXCROSS_TARGET_DIR}/bin/${OSXCROSS_HOST}-install_name_tool" CACHE FILEPATH "install_name_tool")

set(CMAKE_FIND_ROOT_PATH "${CMAKE_FIND_ROOT_PATH}" "${OSXCROSS_SDK}" "${OSXCROSS_TARGET_DIR}/macports/pkgs/opt/local")
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)

set(ENV{PKG_CONFIG_LIBDIR} "${OSXCROSS_TARGET_DIR}/macports/pkgs/opt/local/lib/pkgconfig")
set(ENV{PKG_CONFIG_SYSROOT_DIR} "${OSXCROSS_TARGET_DIR}/macports/pkgs")
