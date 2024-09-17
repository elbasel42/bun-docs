find_command(
  VARIABLE
    CLANG_FORMAT_PROGRAM
  COMMAND
    clang-format
  REQUIRED
    OFF
)

register_command(
  TARGET
    clang-format-check
  COMMENT
    "Running clang-format"
  COMMAND
    ${CLANG_FORMAT_PROGRAM}
      -Werror
      --dry-run
      --verbose
      ${BUN_C_SOURCES}
      ${BUN_CXX_SOURCES}
)

register_command(
  TARGET
    clang-format
  COMMENT
    "Fixing clang-format"
  COMMAND
    ${CLANG_FORMAT_PROGRAM}
      -i # edits files in-place
      --verbose
      ${BUN_C_SOURCES}
      ${BUN_CXX_SOURCES}
)
