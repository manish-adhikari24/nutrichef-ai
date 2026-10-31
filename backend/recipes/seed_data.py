"""Starting rows for the rule and reference tables, loaded by a migration.
Nutrition values are approximate per 100 g figures and should be checked against a
published database such as AUSNUT or USDA FoodData Central."""

# name: kcal, protein, carbs, fat
NUTRITION = {
    'chicken breast': (165, 31, 0, 3.6), 'eggs': (143, 12.6, 0.7, 9.5), 'salmon': (208, 20, 0, 13),
    'tofu': (144, 15.8, 2.8, 8.7), 'beef mince': (250, 26, 0, 15), 'chickpeas': (164, 8.9, 27, 2.6),
    'lentils': (116, 9, 20, 0.4), 'broccoli': (34, 2.8, 7, 0.4), 'spinach': (23, 2.9, 3.6, 0.4),
    'tomato': (18, 0.9, 3.9, 0.2), 'canned tomatoes': (21, 1, 4, 0.2), 'bell pepper': (31, 1, 6, 0.3),
    'carrots': (41, 0.9, 10, 0.2), 'onion': (40, 1.1, 9.3, 0.1), 'mushrooms': (22, 3.1, 3.3, 0.3),
    'garlic': (149, 6.4, 33, 0.5), 'corn': (86, 3.3, 19, 1.4), 'lemon': (29, 1.1, 9.3, 0.3),
    'avocado': (160, 2, 8.5, 14.7), 'banana': (89, 1.1, 23, 0.3), 'apple': (52, 0.3, 14, 0.2),
    'berries': (50, 1, 12, 0.4), 'rice': (130, 2.7, 28, 0.3), 'pasta': (158, 5.8, 31, 0.9),
    'oats': (389, 17, 66, 7), 'quinoa': (120, 4.4, 21, 1.9), 'bread': (265, 9, 49, 3.2),
    'milk': (61, 3.2, 4.8, 3.3), 'greek yogurt': (97, 9, 3.6, 5), 'feta': (264, 14, 4, 21),
    'cheddar': (403, 25, 1.3, 33), 'butter': (717, 0.9, 0.1, 81), 'olive oil': (884, 0, 0, 100),
    'soy sauce': (53, 8, 5, 0.1), 'peanut butter': (588, 25, 20, 50), 'honey': (304, 0.3, 82, 0),
    'parsley': (36, 3, 6, 0.8), 'basil': (23, 3.2, 2.7, 0.6), 'coriander': (23, 2.1, 3.7, 0.5),
    'oregano': (265, 9, 69, 4.3), 'mint': (70, 3.8, 15, 0.9),
}

INGREDIENT_ALIASES = {
    'chicken fillet': 'chicken breast', 'chicken fillets': 'chicken breast', 'chicken breasts': 'chicken breast',
    'egg': 'eggs', 'tomatoes': 'tomato', 'carrot': 'carrots', 'onions': 'onion', 'mushroom': 'mushrooms',
    'capsicum': 'bell pepper', 'red capsicum': 'bell pepper', 'green capsicum': 'bell pepper',
    'cilantro': 'coriander', 'ground beef': 'beef mince', 'garbanzo': 'chickpeas', 'garbanzo beans': 'chickpeas',
    'yoghurt': 'greek yogurt', 'yogurt': 'greek yogurt', 'scallion': 'spring onion', 'scallions': 'spring onion',
}

ALLERGEN_WORDS = {
    'Peanuts': ['peanut', 'groundnut', 'satay'],
    'Tree nuts': ['almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'macadamia', 'brazil nut', 'pine nut', 'praline', 'marzipan'],
    'Milk': ['milk', 'cheese', 'feta', 'butter', 'yogurt', 'yoghurt', 'cream', 'whey', 'ghee', 'parmesan', 'halloumi', 'mozzarella', 'paneer', 'custard'],
    'Eggs': ['egg', 'mayonnaise', 'mayo', 'aioli', 'meringue'],
    'Wheat': ['wheat', 'flour', 'pasta', 'bread', 'couscous', 'noodle', 'tortilla', 'semolina', 'spaghetti', 'soy sauce', 'breadcrumb'],
    'Gluten': ['wheat', 'flour', 'pasta', 'bread', 'couscous', 'barley', 'rye', 'semolina', 'seitan', 'noodle', 'tortilla', 'spaghetti', 'soy sauce', 'breadcrumb'],
    'Soy': ['soy', 'soya', 'tofu', 'edamame', 'tempeh', 'miso'],
    'Fish': ['fish', 'salmon', 'tuna', 'anchovy', 'anchovies', 'sardine', 'cod', 'trout', 'barramundi', 'worcestershire'],
    'Shellfish': ['prawn', 'shrimp', 'crab', 'lobster', 'mussel', 'oyster', 'clam', 'scallop', 'squid'],
    'Sesame': ['sesame', 'tahini'],
    'Lupin': ['lupin', 'lupine'],
}

ALLERGEN_EXCEPTIONS = {
    'Milk': ['coconut milk', 'coconut cream', 'oat milk', 'almond milk', 'soy milk', 'rice milk', 'peanut butter', 'almond butter', 'cashew butter', 'dairy-free', 'cream of tartar'],
    'Wheat': ['rice flour', 'almond flour', 'chickpea flour', 'coconut flour', 'corn flour', 'corn tortilla', 'rice noodle', 'gluten-free', 'wheat-free'],
    'Gluten': ['rice flour', 'almond flour', 'chickpea flour', 'coconut flour', 'corn flour', 'corn tortilla', 'rice noodle', 'gluten-free'],
}

# match, substitute, reason
SUBSTITUTIONS = [
    ('buttermilk', 'Milk with a little lemon juice', 'pantry swap'), ('buttermilk', 'Oat milk with lemon juice', 'dairy-free'),
    ('milk', 'Oat milk', 'dairy-free'), ('milk', 'Soy milk', 'vegan'),
    ('butter', 'Olive oil', 'dairy-free'), ('butter', 'Coconut oil', 'vegan'),
    ('cream', 'Coconut cream', 'dairy-free'), ('cream', 'Greek yogurt', 'lighter'),
    ('yogurt', 'Coconut yogurt', 'dairy-free'), ('yogurt', 'Soy yogurt', 'vegan'),
    ('feta', 'Firm tofu', 'vegan'), ('feta', 'Halloumi', 'budget-friendly'),
    ('cheese', 'Nutritional yeast', 'vegan'),
    ('egg', 'Chia seeds with water', 'vegan'), ('egg', 'Mashed banana', 'for baking'),
    ('chicken', 'Firm tofu', 'vegan'), ('chicken', 'Chickpeas', 'budget-friendly'),
    ('beef', 'Lentils', 'vegan'), ('beef', 'Mushrooms', 'vegan'),
    ('salmon', 'Firm tofu', 'vegan'), ('salmon', 'Trout', 'similar taste'),
    ('soy sauce', 'Coconut aminos', 'soy-free'), ('soy sauce', 'Tamari', 'gluten-free'),
    ('pasta', 'Rice noodles', 'gluten-free'), ('pasta', 'Zucchini noodles', 'lighter'),
    ('rice', 'Quinoa', 'higher protein'), ('rice', 'Cauliflower rice', 'lighter'),
    ('lemon', 'White wine vinegar', 'pantry swap'), ('lemon', 'Lime', 'similar taste'),
    ('parsley', 'Coriander', 'similar use'), ('parsley', 'Basil', 'similar use'),
    ('broccoli', 'Cauliflower', 'similar texture'), ('broccoli', 'Green beans', 'budget-friendly'),
    ('peanut', 'Sunflower seed butter', 'nut-free'), ('almond', 'Pumpkin seeds', 'nut-free'),
    ('paprika', 'Ground cumin', 'pantry swap'),
]

# trigger, title, text
SUPPLEMENTS = [
    ('protein_short', 'Protein', 'This meal is lower in protein than your target. Some people use a protein powder to help close a gap like this, though food sources also work well.'),
    ('training_goal', 'Recovery', 'People training regularly sometimes look at creatine or electrolyte products. Whether these suit you depends on your circumstances.'),
    ('vegan_diet', 'Vitamin B12', 'Vegan diets contain little vitamin B12, so many people on them look at fortified foods or a supplement.'),
]

# goal_type, bmi_category, calories_remaining, priority, title, text
WELLNESS = [
    ('', 'underweight', False, 1, 'Keep energy steady', 'Regular meals and gentle movement you enjoy, such as walking or stretching, can be a good fit. A health professional can give you advice for your situation.'),
    ('weight_loss', '', True, 5, 'A walk after dinner', 'A relaxed 20 to 30 minute walk is an easy way to add some movement to your day.'),
    ('weight_loss', '', False, 6, 'Small, regular movement', 'Short walks spread through the day can add up. Choose a pace where you can still hold a conversation.'),
    ('muscle_gain', '', False, 5, 'Plan your strength sessions', 'Two or three strength sessions a week with rest days between them is a common starting point.'),
    ('athletic_performance', '', False, 5, 'Fuel around training', 'Having a meal with carbs and protein within a few hours of training is a common habit among active people.'),
    ('maintenance', '', False, 5, 'Stay active most days', 'Aim for regular movement you enjoy, such as walking, cycling or swimming.'),
]

# Fallback recipes for demos when the AI isn't available (risk R01). Always labelled as samples.
SAMPLE_RECIPES = [
    {
        'title': 'Lemon-herb chicken and broccoli bowl',
        'description': 'Golden chicken with garlicky broccoli and rice, finished with lemon.',
        'minutes': 25, 'servings': 2, 'difficulty': 'Easy',
        'nutrition': {'kcal': 520, 'protein': 42, 'carbs': 48, 'fat': 16},
        'ingredients': [
            {'name': 'Chicken breast', 'amount': '300 g', 'missing': False, 'grams': 300},
            {'name': 'Broccoli', 'amount': '1 head', 'missing': False, 'grams': 300},
            {'name': 'Rice', 'amount': '300 g cooked', 'missing': False, 'grams': 300},
            {'name': 'Lemon', 'amount': '1', 'missing': False, 'grams': 60},
            {'name': 'Olive oil', 'amount': '1 tbsp', 'missing': False, 'grams': 14},
            {'name': 'Parsley', 'amount': '1 small bunch', 'missing': True, 'grams': 20},
        ],
        'steps': [
            'Cook the rice following the packet instructions.',
            'Season the chicken and cook it in the oil over medium-high heat for 5 to 6 minutes a side, until the centre reaches 75°C.',
            'Rest the chicken. In the same pan, cook the broccoli for 5 minutes with a splash of water.',
            'Slice the chicken and serve over the rice with the broccoli, lemon juice and parsley.',
        ],
        'why_it_fits': 'A balanced, high-protein meal built around common ingredients.',
        'label_checks': [], 'constraint_warning': '',
    },
    {
        'title': 'Chickpea and spinach tomato stew',
        'description': 'A quick one-pot stew with warm spices that works for vegans.',
        'minutes': 20, 'servings': 2, 'difficulty': 'Easy',
        'nutrition': {'kcal': 430, 'protein': 18, 'carbs': 62, 'fat': 12},
        'ingredients': [
            {'name': 'Chickpeas', 'amount': '1 can, drained', 'missing': False, 'grams': 240},
            {'name': 'Canned tomatoes', 'amount': '1 can', 'missing': False, 'grams': 400},
            {'name': 'Spinach', 'amount': '100 g', 'missing': False, 'grams': 100},
            {'name': 'Onion', 'amount': '1', 'missing': False, 'grams': 150},
            {'name': 'Garlic', 'amount': '2 cloves', 'missing': False, 'grams': 6},
            {'name': 'Olive oil', 'amount': '1 tbsp', 'missing': False, 'grams': 14},
            {'name': 'Smoked paprika', 'amount': '1 tsp', 'missing': True},
        ],
        'steps': [
            'Soften the chopped onion and garlic in the oil for 5 minutes.',
            'Stir in the paprika, tomatoes and drained chickpeas, then simmer for 10 minutes.',
            'Fold in the spinach until it wilts, then season to taste.',
        ],
        'why_it_fits': 'Plant-based, high in fibre, and it uses pantry staples.',
        'label_checks': ['Canned tomatoes', 'Smoked paprika'], 'constraint_warning': '',
    },
]
