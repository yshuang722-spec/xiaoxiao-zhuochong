const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
async function verifyAI(win, ai, service) {
  const output = path.join(service.HOME, 'pet-control-client/logs');
  fs.mkdirSync(output, {recursive: true});
  try {
    const js = code => win.webContents.executeJavaScript(code);
    for (let i = 0; i < 100; i++) {
      if (await js('Boolean(document.querySelector("#open-ai"))')) break;
      await new Promise(r => setTimeout(r, 100));
    }
    const roles = await service.list();
    for (const role of roles) {
      const data = await ai.history(role.id);
      assert.ok(data.prompt.length > 0, role.name + '缺少人设');
    }
    await js('document.querySelector(".settings-nav").open=true;document.querySelector("#open-ai").click()');
    for (let i = 0; i < 100; i++) {
      if (await js('document.querySelector("#ai-role").options.length > 0 && document.querySelector("#ai-model").value.length > 0')) break;
      await new Promise(r => setTimeout(r, 100));
    }
    assert.equal(await js('document.querySelector("main").hidden'), true);
    assert.equal(await js('document.querySelector("#settings-page").hidden'), false);
    assert.equal(await js('document.querySelector("#ai-role").options.length'), roles.length);
    const settings = ai.settings();
    assert.equal(settings.secureStorage, true);
    const petHistory = await service.request('/dsh-pet-7340/chat?pet=' + encodeURIComponent(roles[0].id));
    assert.equal(petHistory.source, 'client-ai');
    const sameHistory = await ai.history(roles[0].id);
    const expected = settings.rounds ? sameHistory.messages.slice(-settings.rounds * 2) : [];
    assert.deepEqual(petHistory.messages.map(m => ({role: m.role, content: m.content})), expected.map(m => ({role: m.role, content: m.content})));
    await new Promise(r => setTimeout(r, 400));
    fs.writeFileSync(path.join(output, 'API设置页-实装.png'), (await win.webContents.capturePage()).toPNG());
    fs.writeFileSync(path.join(output, 'ai-verification.json'), JSON.stringify({ok: true, secondaryPage: true,
      secureStorage: true, hasKey: settings.hasKey, petChatSharedBackend: true, roles: roles.map(r => ({id: r.id, name: r.name})), networkTested: false}, null, 2));
  } catch (e) {
    fs.writeFileSync(path.join(output, 'ai-verification.json'), JSON.stringify({ok: false, error: e.message}));
  }
}
module.exports = {verifyAI};
