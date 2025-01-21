/*
    This file is part of the WebKit open source project.
    This file has been generated by generate-bindings.pl. DO NOT MODIFY!

    This library is free software; you can redistribute it and/or
    modify it under the terms of the GNU Library General Public
    License as published by the Free Software Foundation; either
    version 2 of the License, or (at your option) any later version.

    This library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
    Library General Public License for more details.

    You should have received a copy of the GNU Library General Public License
    along with this library; see the file COPYING.LIB.  If not, write to
    the Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor,
    Boston, MA 02110-1301, USA.
*/

#include "config.h"
#include "JSBufferEncodingType.h"
#include "wtf/Forward.h"

#include <JavaScriptCore/JSCInlines.h>
#include <JavaScriptCore/JSString.h>
#include <wtf/NeverDestroyed.h>

namespace WebCore {
using namespace JSC;

String convertEnumerationToString(BufferEncodingType enumerationValue)
{

    static const std::array<NeverDestroyed<String>, 8> values = {
        MAKE_STATIC_STRING_IMPL("utf8"),
        MAKE_STATIC_STRING_IMPL("ucs2"),
        MAKE_STATIC_STRING_IMPL("utf16le"),
        MAKE_STATIC_STRING_IMPL("latin1"),
        MAKE_STATIC_STRING_IMPL("ascii"),
        MAKE_STATIC_STRING_IMPL("base64"),
        MAKE_STATIC_STRING_IMPL("base64url"),
        MAKE_STATIC_STRING_IMPL("hex"),
    };
    ASSERT(static_cast<size_t>(enumerationValue) < std::size(values));
    return values[static_cast<size_t>(enumerationValue)];
}

template<> JSString* convertEnumerationToJS(JSGlobalObject& lexicalGlobalObject, BufferEncodingType enumerationValue)
{
    return jsStringWithCache(lexicalGlobalObject.vm(), convertEnumerationToString(enumerationValue));
}

// this function is mostly copied from node
template<> std::optional<BufferEncodingType> parseEnumeration<BufferEncodingType>(JSGlobalObject& lexicalGlobalObject, JSValue arg)
{
    if (UNLIKELY(!arg.isString())) {
        return std::nullopt;
    }

    auto* str = arg.toStringOrNull(&lexicalGlobalObject);
    if (!str) {
        return std::nullopt;
    }
    const auto& view = str->view(&lexicalGlobalObject);
    return parseEnumeration2(lexicalGlobalObject, view);
}

std::optional<BufferEncodingType> parseEnumeration2(JSGlobalObject& lexicalGlobalObject, const WTF::StringView encoding)
{
    // caller must check if value is a string
    switch (encoding.length()) {
    case 0: {
        return BufferEncodingType::utf8;
    }
    case 1:
    case 2: {
        return std::nullopt;
    }
    default: {
    }
    }

    switch (encoding[0]) {
    case 'u':
    case 'U': {
        if (WTF::equalIgnoringASCIICase(encoding, "utf8"_s))
            return BufferEncodingType::utf8;
        if (WTF::equalIgnoringASCIICase(encoding, "utf-8"_s))
            return BufferEncodingType::utf8;
        if (WTF::equalIgnoringASCIICase(encoding, "ucs2"_s))
            return BufferEncodingType::ucs2;
        if (WTF::equalIgnoringASCIICase(encoding, "ucs-2"_s))
            return BufferEncodingType::ucs2;
        if (WTF::equalIgnoringASCIICase(encoding, "utf16le"_s))
            return BufferEncodingType::ucs2;
        if (WTF::equalIgnoringASCIICase(encoding, "utf-16le"_s))
            return BufferEncodingType::ucs2;
        break;
    }

    case 'l':
    case 'L': {
        if (WTF::equalIgnoringASCIICase(encoding, "latin1"_s))
            return BufferEncodingType::latin1;
        break;
    }

    case 'b':
    case 'B': {
        if (WTF::equalIgnoringASCIICase(encoding, "binary"_s))
            return BufferEncodingType::latin1; // BINARY is a deprecated alias of LATIN1.
        if (WTF::equalIgnoringASCIICase(encoding, "base64"_s))
            return BufferEncodingType::base64;
        if (WTF::equalIgnoringASCIICase(encoding, "base64url"_s))
            return BufferEncodingType::base64url;
        break;
    }

    case 'a':
    case 'A':
        // ascii
        if (WTF::equalLettersIgnoringASCIICase(encoding, "ascii"_s))
            return BufferEncodingType::ascii;
        break;

    case 'h':
    case 'H':
        // hex
        if (WTF::equalIgnoringASCIICase(encoding, "hex"_s))
            return BufferEncodingType::hex;
        if (WTF::equalIgnoringASCIICase(encoding, "hex\0"_s))
            return BufferEncodingType::hex;
        break;
    }

    return std::nullopt;
}
template<> ASCIILiteral expectedEnumerationValues<BufferEncodingType>()
{
    return "\"utf8\", \"ucs2\", \"utf16le\", \"latin1\", \"ascii\", \"base64\", \"base64url\", \"hex\""_s;
}

} // namespace WebCore
