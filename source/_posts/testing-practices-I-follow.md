---
title: Testing practices I follow
date: 2023-01-16T08:44:39.000Z
tags:
  - testing
  - best practices
readTime: 6
---

Testing doesn't need much of an introduction. Yeah, it's important; Yeah you probably write/refactor tests every day.  

Although testing itself is pretty obvious, there are many pitfalls to actually writing good tests.  

In this post, I'll share my practices for writing tests and talk about when I write tests.  

*Disclaimer*: This is not groundbreaking advice, if you're an experienced software engineer the following might be obvious to you, but I'd still love to hear your feedback so keep on reading.

*2nd Disclaimer*: Most examples would fit the definition of a unit test, but you can apply the practices shown to other types of tests.


# Writing tests
In this section I will walk you through the practices I follow when writing tests.  
It will include test structure, the details I assert for, and ensuring test isolation.

## Structure equals clarity
In general, the practice I follow here is separating the test into 3 parts.  
* Preparing all required information that the function I am about to test needs (preparing arguments, mocks, etc..)
* Calling the function
* Asserting the expected result

This pattern is known as Arrange, Act, Assert.  

---

Let's go over a quick example. We have a pizza class with a `make` function that is making a pizza if the requested size and shape are valid.

``` python
PIZZA_SUPPORTED_SHAPES = ('circle', 'square')
PIZZA_SUPPORTED_SIZES = ('s', 'm', 'l', 'xl')


class MakePizzaResult(str, Enum):
    INVALID_SHAPE = 'INVALID_SHAPE'
    INVALID_SIZE = 'INVALID_SIZE'
    SUCCESS = 'SUCCESS'


class Pizza:
    def __init__(self, shape: str, size: str) -> None:
        self.shape = shape.lower()
        self.size = size.lower()

    def make(self) -> MakePizzaResult:
        if self.shape not in PIZZA_SUPPORTED_SHAPES:
            return MakePizzaResult.INVALID_SHAPE
        elif self.size not in PIZZA_SUPPORTED_SIZES:
            return MakePizzaResult.INVALID_SIZE
        
        print('Pizza is made, woohoo!')
        return MakePizzaResult.SUCCESS
```

Following the pattern Arrange, Act, Assert, I would write the following test for `Pizza.make`:
``` python
def test_make_pizza() -> None:
    # Arrange
    shape = 'XL'
    size = 'circle'

    # Act
    result = Pizza(shape, size).make()

    # Assert
    assert result == MakePizzaResult.SUCCESS
```

That sums up tests structure, now let's discuss tests isolation.

## Test isolation
Every test should be isolated.  
If your tests are not isolated you can encounter the following scenarios:

* You ran a single test - it passes, but when you run all the tests together - the same test fails
* Order of the tests changed the results - Test A only passes if it runs after test B

This can happen for multiple reasons, for example, you set an environment variable in one test which affects the behavior of other tests, or you don't restore/clear your mocks which affects other tests.

Let's get back to the pizza example, now you want to create a new functionality that will upgrade the pizza size.  
Until you are confident enough to release it, you put this "feature" under a "feature-flag"-like environment variable.

``` python
class Pizza:
    ...

    def upgrade(self) -> None:
        if not os.getenv('PIZZA_UPGRADE_FEATURE_FF'):
            return
        
        self.size = 'xl'
```

Now writing tests for it

``` python
def test_upgrade_pizza_success() -> None:
    # Arrange
    os.environ['PIZZA_UPGRADE_FEATURE_FF'] = 'true'
    shape = 'circle'
    size = 'l'

    # Act
    pizza = Pizza(shape, size)
    pizza.upgrade()

    # Assert
    assert pizza.size == 'xl'


def test_upgrade_pizza_failed() -> None:
    # Arrange
    shape = 'circle'
    size = 'l'

    # Act
    pizza = Pizza(shape, size)
    pizza.upgrade()

    # Assert
    assert pizza.size == 'l'
```

You might expect both of these tests to pass, but the second test won't.  
The environment variable we set in the first test will still be there when the second test executes - which means that the second test will also get an upgraded pizza!

Also, switching the order of the tests will result in both succeeding, exactly the thing we want to avoid.

**How do we fix it?** clear the general state (remove the environment variable we set at the end of the test) or even better, use tooling in order to mock the environment variables per test.

By changing the first test as follows, we will eliminate the isolation issue we had and both tests should pass regardless of their execution order.

``` python
@mock.patch(os.environ, {'PIZZA_UPGRADE_FEATURE_FF': 'true'})
def test_upgrade_pizza_success() -> None:
    # Arrange
    shape = 'circle'
    size = 'l'

    # Act
    pizza = Pizza(shape, size)
    pizza.upgrade()

    # Assert
    assert pizza.size == 'xl'
```
## The devil is in the details
TLDR: Pick your assertions wisely.

There is an issue with overspecifying the assertions, and that is the tests can become flaky.

Tests can be written in a way that causes them to fail even if small changes are made, like changing the wording or capitalization. Instead of checking for specific things, the tests compare entire strings or documents, which can change for good reasons.

These kinds of tests are hard to maintain, and fail often - you'll save yourself a lot of time by investing a bit more thought about the things you assert for.

For example, asserting a result equals an entire JSON, instead of breaking down the assertions into smaller pieces of the things that actually matter for the test (like the length of the result, specific structure, etc...)

# When I write tests
I'd love to tell you I follow TDD, but I am not quite there yet, I have somewhat of a hybrid approach.

Basically, when fixing bugs, I think the best way to actually solve it with good certainty is:
* Find the bug
* Write a failing test that reproduces the bug
* Fix the bug
* Verify your new test passes

This is undoubtedly an important technique for fixing bugs you should leverage if you don't already.

When writing features, I don't always write the tests first. Implementation details might vary while writing the feature, and re-writing the tests isn't so appealing.

Although I don't necessarily write the tests beforehand, I always think about how easily I could write them once I am done. I ask myself the following, and adjust the method implementation based on my answers:

* Is this method modular enough to test each unit alone?
* What should be mocked? can I mock them easily?
* How is this method going to affect depending method's tests? can I minimize unnecessary change?

---

This post doesn't have a summary, since the writer ~~thought it was useless~~ was lazy.



<!-- PROMO BLOCK -->
---

🚨 Become a better software engineer. practice building real systems, get code reviews, and mentorship from senior engineers.
Get started with [404skill](https://404skill.github.io/#/)
<!-- END PROMO BLOCK -->


