import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule DI graph', () => {
  it('compiles — every controller/service resolves', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  }, 30000);
});
