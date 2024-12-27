#pragma once

#include "root.h"
#include <JavaScriptCore/InternalFunction.h>

namespace Bun {

using namespace JSC;

class JSWritableStreamDefaultControllerPrototype;

JSC_DECLARE_HOST_FUNCTION(callJSWritableStreamDefaultController);
JSC_DECLARE_HOST_FUNCTION(constructJSWritableStreamDefaultController);

class JSWritableStreamDefaultControllerConstructor final : public JSC::InternalFunction {
public:
    using Base = JSC::InternalFunction;
    static constexpr unsigned StructureFlags = Base::StructureFlags;
    static constexpr bool needsDestruction = false;

    static JSWritableStreamDefaultControllerConstructor* create(
        JSC::VM& vm,
        JSC::JSGlobalObject* globalObject,
        JSWritableStreamDefaultControllerPrototype* prototype);

    DECLARE_INFO;
    template<typename, JSC::SubspaceAccess mode>
    static JSC::GCClient::IsoSubspace* subspaceFor(JSC::VM& vm)
    {
        if constexpr (mode == JSC::SubspaceAccess::Concurrently)
            return nullptr;
        return &vm.internalFunctionSpace();
    }

    static JSC::Structure* createStructure(JSC::VM& vm, JSC::JSGlobalObject* globalObject, JSC::JSValue prototype)
    {
        return JSC::Structure::create(vm, globalObject, prototype,
            JSC::TypeInfo(JSC::InternalFunctionType, StructureFlags), info(), NonArray, 2);
    }

private:
    JSWritableStreamDefaultControllerConstructor(JSC::VM& vm, JSC::Structure* structure)
        : Base(vm, structure, callJSWritableStreamDefaultController, constructJSWritableStreamDefaultController)
    {
    }

    void finishCreation(JSC::VM&, JSC::JSGlobalObject*, JSWritableStreamDefaultControllerPrototype*);
};

} // namespace Bun
