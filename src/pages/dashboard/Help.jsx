const QUESTIONS = [
  ['How do I generate a recipe?', 'Open Generate recipe, add your ingredients, choose any filters and select Generate recipe.'],
  ['How are allergies handled?', 'Add them in your Allergy profile. We check your ingredients and each recipe against that list, and block recipes that contain an allergen. We can\'t see inside packaged products, so always check labels yourself.'],
  ['Where do nutrition numbers come from?', 'We calculate them from our nutrition dataset where we can, and use AI estimates for other ingredients. Each recipe says which it used, and all values are approximate.'],
  ['How do I track what I eat?', 'Select Log as eaten on a recipe. It then counts toward your dashboard, Nutrition tracker and Progress.'],
  ['Is this medical advice?', 'No. NutriChef AI gives general information only. Talk to a doctor or dietitian about your own health.'],
  ['Where is my data stored?', 'In your NutriChef AI account. With your consent, your diet, allergies, dislikes and targets are also sent to our AI provider to write recipes. You can delete everything in Settings.'],
];

export default function Help() {
  return (
    <>
      <h1 className="dash-title">Help</h1>
      <div className="help-list">
        {QUESTIONS.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </>
  );
}
