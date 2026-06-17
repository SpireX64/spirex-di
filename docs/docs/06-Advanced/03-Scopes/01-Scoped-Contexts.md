# Scoped Contexts

The container supports dividing the application context into **scopes**. Scopes allow you not only to **logically separate different parts** of the application, but also to **control the lifecycle of instances** created within those parts.

A scope is created by calling the container’s `scope` method and passing a unique scope identifier. Once created, the scope can be used to resolve instances that belong to it.

In practice, the **container itself acts as the root scope**. This means every operation available on the container is also available on any scope—such as resolving instances via `get`, `providerOf`, and similar APIs.


## Creating and Using a Scope
A typical use case is isolating services for a specific application feature or page. For example, you can create a dedicated scope for a catalog page and resolve page-specific services from it:

```ts
const catalogPageScope = container.scope("catalog-page");

const service = catalogPageScope.get("CatalogService");
```

The scope identifier can be any non-empty string. An empty string is reserved as the identifier of the root scope.

You can retrieve the identifier of a scope through the read-only `id` property:

```ts
console.log(catalogPageScope.id); // "catalog-page"
```

This is useful for diagnostics, logging, or debugging when working with multiple active scopes.


## Scope Hierarchy
Scopes can form hierarchical structures. Almost **any scope can create child scopes**, enabling you to model complex application trees such as UI regions, pages, and nested components.

Child scopes are created the same way—by calling `scope` on the parent scope:

```ts
// root -> "ui" -> "catalog-page" -> "modal"
const catalogModalScope = catalogPageScope.scope("modal");

// root -> "ui" -> "profile-page" -> "modal"
const profileModalScope = profilePageScope.scope("modal");

assert(catalogModalScope !== profileModalScope);
```

Scope identifiers **must be unique only within the same branch of the hierarchy**. Identical identifiers are allowed in **different** branches, because each scope is fully qualified by its hierarchical path.


## Idempotent Scope Creation
Scope creation is idempotent within the same parent. If a scope with the given identifier already exists, it returns the existing instance instead of creating a new one.

```ts
const modalScopeA = catalogPageScope.scope("modal");
const modalScopeB = catalogPageScope.scope("modal");

assert(modalScopeA === modalScopeB);
```

This guarantees that repeated scope requests do not lead to duplication and that services resolved within that scope share the same lifecycle.


## Scope Path
Each scope exposes its **hierarchical path** via the read-only `path` property.

The path is an **ordered list of scope identifiers** starting from the level closest to the root and ending with the current scope. The root scope identifier is **excluded**, since it is always the same and serves as the universal hierarchy origin.

```ts
console.log(profileModalScope.path);
// ["ui", "catalog-page", "modal"]
```

This is particularly useful for debugging, tracing resolution context, or building scope-aware tooling.


## Accessing Parent Scopes
The scope method can also be used to retrieve a parent scope from any depth in the hierarchy by passing the parent’s identifier:

```ts
const uiScope = profileModalScope.scope("ui");
```

This allows navigation across the scope tree without manually storing references to every level.


## Checking Child Scope Existence
To check whether a child scope already exists without creating it, use `hasChildScope`:

```ts
const isModalScopeExists =
  profilePageScope.hasChildScope("modal");
```

This is helpful when lifecycle management or conditional initialization depends on whether a scope has already been established.

## Scope Disposal
Scopes exist until they are explicitly removed. Disposal is performed via the `dispose` method:

```ts
profileModalScope.dispose();
```

Once disposed:
- The scope can no longer resolve instances.
- It cannot create child scopes.
- Requesting a scope with the same identifier again will create a new, fresh scope instance.

Scope disposing is a broad topic with important nuances related to instance lifecycles, cascading disposal, and resource management. These details go beyond the scope of this section. For this reason, working with scope disposal is documented separately in a dedicated section.


-------------------
## Summary

Scopes partition the container into contextual regions that encapsulate instance lifecycles and resolution boundaries.

They form hierarchical trees, allowing you to model application structure such as UI layers, pages, and components. Scope creation is idempotent within a branch, and each scope exposes metadata like its identifier and hierarchical path. You can navigate the hierarchy, check for existing children, and explicitly dispose of scopes when their lifecycle ends. This mechanism enables precise control over dependency lifetimes in complex applications.

!==========================

Контейнер позволяет определить контекст приложения на области. Области дают не только выделить разные части приложения, но так же ограничить жизненный цикл экземпляров создаваемых внутри этих областей.

Область создается с помощью вызова метода `scope` у контейнера и передачи уникального идентификатора области. После чего область можно будет использовать для получения экземпляров из нее.

Фактически, контейнер сам является уникальной коренной областью. Поэтому с ним можно делать все тоже самое что и с любой другой областью и наоборот. Поэтому в области доступны все операции по получению экземпляров типов из контейнера (`get`, `providerOf` и т.д.).

Например, можно выделить область для определенной страницы приложения и получить специфичный для нее сервис с помощью полученной области.
```ts
const catalogPageScope = container.scope("catalog-page");

const service = catalogPageScope.get("CatalogService");
```

В качестве идентификатора может использоваться любая не пустая строка. Пустая строка используется как идентификатор коренной области.

Идентификатор области можно получить с помощью свойства `id`, что позволяет узнать с какая сейчас область доступна:
```ts
console.log(catalogPageScope.id); // "catalog-page"
```

Почти любая область может иметь дочерние области, что позволяет делать сложные иерархии областей. Дочернии области создаются таким же образом, с помощью вызова метода `scope` у области с передачей идентификатора. Идентификатор области должен быть уникален только в пределах одной ветки такой иерархии. В разных ветках допустимы области с одинаковыми идентификаторами.

```ts
// root -> "ui" -> "catalog-page" -> "modal"
var catalogModalScope = catalogPageScope.scope("modal");

// root -> "ui" -> "profile-page" -> "modal"
var profileModalScope = profilePageScope.scope("modal");

assert(catalogModalScope !== profileModalScope);
```

Если область с переданным идентификатором уже была создана ранее, то будет возвращена уже существующая область. Поэтому при повторном запросе области, дублирования области не произойдет.

```ts
var modalScopeA = catalogPageScope.scope("modal");
var modalScopeB = catalogPageScope.scope("modal");

assert(modalScopeA === modalScopeB);
```

Область так же позволяет получить иерархию идентификаторов (путь) в которую она входит. Для этого область предоставляет свойство `path`, которое является списком только для чтения. В начале идут области, что находятся ближе к корню иерархии, а последним элементом будет текущая область. Идентификатор коренной области не входит в эту иерархию, так как он будет является корнем для всех областей и имеет один и тот же идентификатор.

```ts
console.log(profileModalScope.path); // ["ui", "catalog-page", "modal"]
```

Метод `scope` позволяет не только создать дочернюю область, но и получить ссылку на родительскую с любого уровня иерархии. Для этого нужно передать идентификатор родительской области:

```ts
const uiScope = profileModalScope.scope("ui");
```

Проверить, существование дочерней области можно с помощью метода `hasChildScope`, что позволяет выполнить простую проверку без создания самой области:

```ts
var isModalScopeExists = profilePageScope.hasChildScope("modal"); 
```

Области существуют пока они не будут удалены/очищены. Удаление области выполняется с помощью метода `dispose`. После очистки, область более не сможет предоставлять экземпляры и создавать дочерние области. Если после очистки запросить область с тем же идентификатором, то будет создана новая область.

```ts
profileModalScope.dispose()
```

Очистка области это отдельная тема документации, поэтому она будет рассмотрена подробно в отдельном разделе.