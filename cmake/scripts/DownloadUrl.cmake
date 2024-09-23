get_filename_component(SCRIPT_NAME ${CMAKE_CURRENT_LIST_FILE} NAME)
message(STATUS "Running script: ${SCRIPT_NAME}")

if(NOT DOWNLOAD_URL OR NOT DOWNLOAD_PATH)
  message(FATAL_ERROR "DOWNLOAD_URL and DOWNLOAD_PATH are required")
endif()

if(CMAKE_SYSTEM_NAME STREQUAL "Windows")
  set(TMP_PATH $ENV{TEMP})
else()
  set(TMP_PATH $ENV{TMPDIR})
endif()

if(NOT TMP_PATH)
  set(TMP_PATH ${CMAKE_BINARY_DIR}/tmp)
endif()

string(REGEX REPLACE "[^a-zA-Z0-9]" "-" DOWNLOAD_ID ${DOWNLOAD_URL})
set(DOWNLOAD_TMP_PATH ${TMP_PATH}/${DOWNLOAD_ID})
set(DOWNLOAD_TMP_FILE ${DOWNLOAD_TMP_PATH}/tmp)
file(REMOVE_RECURSE ${DOWNLOAD_TMP_PATH})

foreach(i RANGE 10)
  set(DOWNLOAD_TMP_FILE_${i} ${DOWNLOAD_TMP_FILE}.${i})

  if(i EQUAL 0)
    message(STATUS "Downloading ${DOWNLOAD_URL}...")
  else()
    message(STATUS "Downloading ${DOWNLOAD_URL}... (retry ${i})")
  endif()
  
  file(DOWNLOAD
    ${DOWNLOAD_URL}
    ${DOWNLOAD_TMP_FILE_${i}}
    HTTPHEADER "User-Agent: cmake/${CMAKE_VERSION}"
    STATUS DOWNLOAD_STATUS
    INACTIVITY_TIMEOUT 60
    TIMEOUT 180
    SHOW_PROGRESS
  )

  list(GET DOWNLOAD_STATUS 0 DOWNLOAD_STATUS_CODE)
  if(DOWNLOAD_STATUS_CODE EQUAL 0)
    file(RENAME ${DOWNLOAD_TMP_FILE_${i}} ${DOWNLOAD_TMP_FILE})
    break()
  endif()

  list(GET DOWNLOAD_STATUS 1 DOWNLOAD_STATUS_TEXT)
  file(REMOVE ${DOWNLOAD_TMP_FILE_${i}})
  message(WARNING "Download failed: ${DOWNLOAD_STATUS_CODE} ${DOWNLOAD_STATUS_TEXT}")
endforeach()

if(NOT EXISTS ${DOWNLOAD_TMP_FILE})
  file(REMOVE_RECURSE ${DOWNLOAD_TMP_PATH})
  message(FATAL_ERROR "Download failed after too many attempts: ${DOWNLOAD_URL}")
endif()

get_filename_component(DOWNLOAD_FILENAME ${DOWNLOAD_URL} NAME)
if(DOWNLOAD_FILENAME MATCHES "\\.(zip|tar|gz|xz)$")
  message(STATUS "Extracting ${DOWNLOAD_FILENAME}...")

  set(DOWNLOAD_TMP_EXTRACT ${DOWNLOAD_TMP_PATH}/extract)
  file(ARCHIVE_EXTRACT
    INPUT ${DOWNLOAD_TMP_FILE}
    DESTINATION ${DOWNLOAD_TMP_EXTRACT}
    TOUCH
  )

  file(REMOVE ${DOWNLOAD_TMP_FILE})

  if(DOWNLOAD_FILTERS)
    list(TRANSFORM DOWNLOAD_FILTERS PREPEND ${DOWNLOAD_TMP_EXTRACT}/ OUTPUT_VARIABLE DOWNLOAD_GLOBS)
  else()
    set(DOWNLOAD_GLOBS ${DOWNLOAD_TMP_EXTRACT}/*)
  endif()

  file(GLOB DOWNLOAD_TMP_EXTRACT_PATHS LIST_DIRECTORIES ON ${DOWNLOAD_GLOBS})
  list(LENGTH DOWNLOAD_TMP_EXTRACT_PATHS DOWNLOAD_COUNT)

  if(DOWNLOAD_COUNT EQUAL 0)
    file(REMOVE_RECURSE ${DOWNLOAD_TMP_PATH})

    if(DOWNLOAD_FILTERS)
      message(FATAL_ERROR "Extract failed: No files found matching ${DOWNLOAD_FILTERS}")
    else()
      message(FATAL_ERROR "Extract failed: No files found")
    endif()
  endif()

  if(DOWNLOAD_FILTERS)
    set(DOWNLOAD_TMP_FILE ${DOWNLOAD_TMP_EXTRACT_PATHS})
  elseif(DOWNLOAD_COUNT EQUAL 1)
    list(GET DOWNLOAD_TMP_EXTRACT_PATHS 0 DOWNLOAD_TMP_FILE)
    get_filename_component(DOWNLOAD_FILENAME ${DOWNLOAD_TMP_FILE} NAME)
    message(STATUS "Hoisting ${DOWNLOAD_FILENAME}...")
  else()
    set(DOWNLOAD_TMP_FILE ${DOWNLOAD_TMP_EXTRACT})
  endif()
endif()

if(DOWNLOAD_FILTERS)
  foreach(file ${DOWNLOAD_TMP_FILE})
    file(RENAME ${file} ${DOWNLOAD_PATH})
  endforeach()
else()
  file(REMOVE_RECURSE ${DOWNLOAD_PATH})
  get_filename_component(DOWNLOAD_PARENT_PATH ${DOWNLOAD_PATH} DIRECTORY)
  file(MAKE_DIRECTORY ${DOWNLOAD_PARENT_PATH})
  file(RENAME ${DOWNLOAD_TMP_FILE} ${DOWNLOAD_PATH})
endif()

get_filename_component(DOWNLOAD_FILENAME ${DOWNLOAD_PATH} NAME)
message(STATUS "Saved ${DOWNLOAD_FILENAME}")

file(REMOVE_RECURSE ${DOWNLOAD_TMP_PATH})
