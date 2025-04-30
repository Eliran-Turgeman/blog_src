---
title: On over-engineering; finding the right balance
date: 2024-09-07T11:39:26.000Z
tags:
  - software design
  - best practices
readTime: 7
---

A big debate among developers is whether to write code for today's problem or to build a general-purpose solution for future needs. Both approaches have their pros and cons. Specific-purpose code can quickly become messy. But overly general code can add unnecessary complexity. This post, obviously opinionated, argues for a middle ground. That's the sweet spot, as always.

We will look at the dangers of overgeneralizing and not generalizing at all through two examples: a shopping cart and a vehicle rental system.

## Shopping Cart System - The Problem with Specific-Purpose Code

Imagine you’re building a shopping cart system, and you need to remove items. A specific-purpose solution might give you a method for each removal task, like this:

```csharp
public class ShoppingCart
{
    public void RemoveItemById(string itemId)
    {
        _items.RemoveAll(item => item.Id == itemId);
    }

    public void RemoveAllOutOfStockItems()
    {
        _items.RemoveAll(item => item.IsOutOfStock);
    }

    public void ClearCart()
    {
        _items.Clear();
    }
}
```

This works fine if your only goals are removing items by ID or clearing the cart. But the problems start to stack up fast:

* Cognitive Load: You're adding a new method for each scenario. As you add features, the class becomes more cluttered. Want to add another removal condition? Get ready to write another method.

* Shallow Design: Each method does one specific thing. That seems fine until you realize your interface is full of shallow, one-off methods. That makes it hard to maintain and extend.

This approach is good for now. But, it will limit you later. Your code will quickly get out of control.

## Shopping Cart System - The Overly Bloated, Generic Solution

To solve this, some devs go too far. They overcomplicate things by making their code too generic. They try to cover every possible scenario, even ones that don’t exist yet. You might end up with something like this:

```csharp
public class ShoppingCart
{
    public void RemoveItems(
        Func<Item, bool> condition,
        IExternalRuleService ruleService,
        Func<List<Item>, List<Item>> externalFilter,
        Action<Item> onItemRemoved)
    {
        var filteredItems = externalFilter(_items);

        // Remove items based on condition and external rules
        foreach (var item in filteredItems.Where(condition))
        {
            if (ruleService.IsItemRemovable(item))
            {
                _items.Remove(item);
                onItemRemoved?.Invoke(item); // Optional callback for each removal
            }
        }
    }
}
```

Now you’ve got a method that can do everything… but it’s a nightmare to use.

* Too Many Responsibilities: This method does way too much. It removes items, interacts with an external rule service, applies external filters, and triggers callbacks. All this for what should be a simple operation: removing items from a shopping cart.

* Unnecessary Complexity: You don’t always need to check with external systems or pass in callback functions for simple tasks. When you try to remove an out-of-stock item, you end up with something like:

```csharp
cart.RemoveItems(
    item => item.IsOutOfStock,
    null,                  // No external rule service
    items => items,        // No external filter
    null);                 // No callback
```

This is way too much complexity for something that should be straightforward. You don’t want to drag in rules and filters for a simple remove operation. It’s overkill and just adds mental overhead.

## Shopping Cart System - The Balanced Approach

Now let’s find the middle ground. Instead of being too specific or too generic, you build something flexible, simple, and clear.

Here’s what it looks like:

```csharp
public class ShoppingCart
{
    public void RemoveItems(Func<Item, bool> condition)
    {
        // Remove items from the cart that meet the condition
        _items.RemoveAll(condition);
    }
}
```

This approach is great because:

* Simplicity: You’re not adding extra methods for every possible removal condition. Instead, use one method (RemoveItems). Pass a condition that defines what to remove.

Examples:

```csharp
// Remove an item by its ID
cart.RemoveItems(item => item.Id == "123");

// Remove all out-of-stock items
cart.RemoveItems(item => item.IsOutOfStock);

// Clear the cart
cart.RemoveItems(item => true);
```

* General enough, but not too general: This method is flexible. It can handle various removal scenarios without being too abstract. It's simple, clear, and doesn't add complexity with external filters or rules. It removes items based on a condition, which is all you need right now.

## Vehicle Rental System – Predicting the Future Wrong with Bad Abstractions

Now, let’s see the result of misjudging future needs and making bad abstractions. This is another common pitfall of early generalization.

Imagine you're designing a system for a vehicle rental company. The system must handle car rentals. You want to future-proof the code in case the company expands to renting boats or planes. So, you decide to create a highly abstract `Vehicle` class:

```csharp
public abstract class Vehicle
{
    public abstract void StartEngine();
    public abstract void StopEngine();
    public abstract void Refuel();
    public abstract void Park();
}

public class Car : Vehicle
{
    public override void StartEngine() { /* Start car engine */ }
    public override void StopEngine() { /* Stop car engine */ }
    public override void Refuel() { /* Refuel car */ }
    public override void Park() { /* Park car */ }
}
```

Then the PM comes one day, throwing you a curveball. The company now wants to support bikes. So, you try to extend your `Vehicle` class. You end up with the following:

```csharp
public class Bike : Vehicle
{
    public override void StartEngine()
    {
        throw new NotImplementedException("Bikes don’t have an engine!");
    }

    public override void StopEngine()

    {
        throw new NotImplementedException("Bikes don’t have an engine!");
    }

    public override void Refuel() { /* Refuel bike */ }
    public override void Park() { /* Park bike */ }
}
```

You thought you were smart to future-proof the design with a flexible Vehicle class. But, you've made some serious mistakes:

* Wrong abstraction: Bikes don't have engines. Now, you must throw NotImplementedException for methods that don't make sense. This creates confusion and violates the purpose of abstraction.

* Rigid and hard to extend: When the company starts renting electric scooters (which need to be charged, not refueled), your design breaks down. You’d need to either shoehorn charging into the existing abstraction or refactor the entire system.

## Vehicle Rental System – Refactoring to the Right Abstraction

```csharp
public interface IRefuelable
{
    void Refuel();
}

public interface IParkable
{
    void Park();
}

public interface IEngineOperable
{
    void StartEngine();
    void StopEngine();
}

public interface IChargeable
{
    void ChargeBattery();
}

public class Car : IEngineOperable, IRefuelable, IParkable
{
    public void StartEngine() { /* Start car engine */ }
    public void StopEngine() { /* Stop car engine */ }
    public void Refuel() { /* Refuel car */ }
    public void Park() { /* Park car */ }
}

public class Bike : IParkable
{
    public void Park() { /* Park bike */ }
}

public class ElectricScooter : IParkable, IChargeable
{
    public void Park() { /* Park scooter */ }
    public void ChargeBattery() { /* Charge battery */ }
}
```

Now, each vehicle type implements only the needed interfaces. You avoid unnecessary abstractions, like StartEngine for bikes or Refuel for electric scooters.

* Flexibility without overgeneralizing: The system can adapt to future changes (e.g., adding boats or planes) without having a clutter of methods that doesn't make sense.

* Correct abstractions: Each vehicle has the appropriate behavior without being forced into a one-size-fits-all Vehicle class. You avoid the pitfalls of predicting future needs and getting it wrong.

## Conclusion

The lesson here is simple: don’t overgeneralize or abstract too much too soon. It's great to solve today's problems and allow for future growth. But trying to predict every future scenario can backfire. In the shopping cart example, overcomplicating a simple task led to unnecessary complexity. In the vehicle rental system, poor demand prediction caused bad abstractions. This forced a refactor.

Find the balance. Create flexible, general-purpose code. It should allow for future changes but avoid over-engineering. Focus on the problem at hand. When it's time to extend the system, your code will be ready for it without needing a rebuild.

When designing a module, ask: How can I make it flexible without going overboard?


<!-- PROMO BLOCK -->
---

🚨 Become a better software engineer. practice building real systems, get code reviews, and mentorship from senior engineers.
Get started with [404skill](https://404skill.github.io/#/)
<!-- END PROMO BLOCK -->
