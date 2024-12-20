#include "root.h"
#include "BunReadableStreamDefaultControllerConstructor.h"
#include <JavaScriptCore/JSObjectInlines.h>

namespace Bun {

using namespace JSC;

const ClassInfo JSReadableStreamDefaultControllerConstructor::s_info = { "ReadableStreamDefaultController"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(JSReadableStreamDefaultControllerConstructor) };

JSReadableStreamDefaultControllerConstructor* JSReadableStreamDefaultControllerConstructor::create(VM& vm, JSGlobalObject* globalObject, Structure* structure, JSObject* prototype)
{
    JSReadableStreamDefaultControllerConstructor* ptr = new (NotNull, allocateCell<JSReadableStreamDefaultControllerConstructor>(vm)) JSReadableStreamDefaultControllerConstructor(vm, structure);
    ptr->finishCreation(vm, globalObject, prototype);
    return ptr;
}

JSReadableStreamDefaultControllerConstructor::JSReadableStreamDefaultControllerConstructor(VM& vm, Structure* structure)
    : Base(vm, structure, nullptr, construct)
{
}

void JSReadableStreamDefaultControllerConstructor::finishCreation(VM& vm, JSGlobalObject* globalObject, JSObject* prototype)
{
    Base::finishCreation(vm, 0, "ReadableStreamDefaultController"_s, PropertyAdditionMode::WithoutStructureTransition);
    putDirectWithoutTransition(vm, vm.propertyNames->prototype, prototype, PropertyAttribute::DontEnum | PropertyAttribute::DontDelete | PropertyAttribute::ReadOnly);
}

} // namespace Bun
